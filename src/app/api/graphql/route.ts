import { createYoga } from "graphql-yoga";
import { schema } from "@/lib/graphql/schema";
import { consumeRateLimit } from "@/lib/cache";
import { getClientAddress } from "@/lib/request-security";

const yoga = createYoga({ schema, graphqlEndpoint: "/api/graphql", fetchAPI: { Response } });
const maxRequestBytes = 64 * 1024;
const maxGetUrlLength = 10 * 1024;

async function handleGraphQL(request: Request): Promise<Response> {
  if (request.method !== "OPTIONS") {
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > maxRequestBytes || (request.method === "GET" && request.url.length > maxGetUrlLength)) {
      return Response.json({ errors: [{ message: "GraphQL request is too large." }] }, { status: 413 });
    }

    const limit = await consumeRateLimit(`graphql:${getClientAddress(request)}`, 120, 60);
    if (limit.unavailable) {
      return Response.json({ errors: [{ message: "Query protection is temporarily unavailable." }] }, { status: 503 });
    }
    if (!limit.allowed) {
      return Response.json({ errors: [{ message: "Query rate limit exceeded." }] }, {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      });
    }
  }

  return yoga(request);
}

export const GET = handleGraphQL;
export const POST = handleGraphQL;
export const OPTIONS = handleGraphQL;
