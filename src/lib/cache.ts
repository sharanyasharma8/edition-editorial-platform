import "server-only";
import Redis from "ioredis";

let redis: Redis | null | undefined;
const localWindows = new Map<string, { count: number; resetAt: number }>();

function getRedis() {
  if (redis !== undefined) return redis;
  if (!process.env.REDIS_URL) return (redis = null);
  try {
    redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 800,
      enableOfflineQueue: false,
    });
    // Without a listener ioredis logs "Unhandled error event" on every failed reconnect.
    redis.on("error", () => undefined);
  } catch {
    redis = null;
  }
  return redis;
}

async function connect(client: Redis) {
  if (client.status === "wait" || client.status === "end") await client.connect();
}

export async function cached<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  const client = getRedis();
  if (client) {
    try {
      await connect(client);
      const existing = await client.get(key);
      if (existing) return JSON.parse(existing) as T;
      const result = await load();
      await client.set(key, JSON.stringify(result), "EX", ttlSeconds);
      return result;
    } catch (error) {
      console.warn("[edition] Redis unavailable; bypassing cache.", error);
    }
  }
  return load();
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  unavailable?: boolean;
}

/** Shared Redis fixed-window limiter with a process-local fallback for development. */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const client = getRedis();
  const allowLocalFallback = process.env.NODE_ENV !== "production" || process.env.ENABLE_DEMO_AUTH === "true";
  if (client) {
    try {
      await connect(client);
      const result = await client.eval(
        "local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; local ttl = redis.call('TTL', KEYS[1]); return {count, ttl}",
        1,
        `edition:ratelimit:${key}`,
        String(windowSeconds),
      ) as [number, number];
      return {
        allowed: result[0] <= limit,
        remaining: Math.max(0, limit - result[0]),
        retryAfterSeconds: Math.max(1, Number(result[1]) || windowSeconds),
      };
    } catch (error) {
      console.warn("[edition] Redis rate limiter unavailable.", error);
      if (!allowLocalFallback) return { allowed: false, remaining: 0, retryAfterSeconds: windowSeconds, unavailable: true };
    }
  } else if (!allowLocalFallback) {
    return { allowed: false, remaining: 0, retryAfterSeconds: windowSeconds, unavailable: true };
  }

  const now = Date.now();
  const current = localWindows.get(key);
  const window = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + windowSeconds * 1000 }
    : current;
  window.count += 1;
  localWindows.set(key, window);
  if (localWindows.size > 2_000) {
    for (const [storedKey, value] of localWindows) {
      if (value.resetAt <= now) localWindows.delete(storedKey);
    }
  }
  return {
    allowed: window.count <= limit,
    remaining: Math.max(0, limit - window.count),
    retryAfterSeconds: Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
  };
}

export async function invalidateEditorialCache() {
  const client = getRedis();
  if (!client) return;
  try {
    await connect(client);
    // SCAN avoids Redis' blocking KEYS command as the editorial cache grows.
    let cursor = "0";
    do {
      const [nextCursor, keys] = await client.scan(
        cursor,
        "MATCH",
        "graphql:edition:*",
        "COUNT",
        "100",
      );
      cursor = nextCursor;
      if (keys.length) await client.del(...keys);
    } while (cursor !== "0");
  } catch (error) {
    console.warn("[edition] Cache invalidation skipped.", error);
  }
}


/** Redis is optional in local development but required for production rate limiting. */
export async function checkRedisConnection(): Promise<boolean> {
  if (!process.env.REDIS_URL) return process.env.NODE_ENV !== "production";
  const client = getRedis();
  if (!client) return false;
  try {
    await connect(client);
    return (await client.ping()) === "PONG";
  } catch {
    return false;
  }
}
