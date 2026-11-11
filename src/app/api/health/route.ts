import { NextResponse } from "next/server";
import { checkRedisConnection } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, boolean> = { web: true, database: true, redis: true, ai: true };

  if (process.env.EDITION_USE_DB === "true") {
    try {
      const { prisma } = await import("@/lib/prisma");
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      console.error("[edition] Readiness database check failed.", error);
      checks.database = false;
    }
  } else if (process.env.NODE_ENV === "production") {
    checks.database = false;
  }

  checks.redis = await checkRedisConnection();

  if (process.env.AI_SERVICE_URL) {
    try {
      const aiHealth = await fetch(new URL("/v1/health", process.env.AI_SERVICE_URL), {
        cache: "no-store",
        signal: AbortSignal.timeout(1_200),
      });
      checks.ai = aiHealth.ok;
    } catch {
      checks.ai = false;
    }
  } else if (process.env.NODE_ENV === "production") {
    checks.ai = false;
  }

  const ready = Object.values(checks).every(Boolean);
  return NextResponse.json({
    status: ready ? "ok" : "not_ready",
    service: "edition-web",
    checks,
    timestamp: new Date().toISOString(),
  }, {
    status: ready ? 200 : 503,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
