/** Request-origin and client-address helpers for cookie-authenticated mutations. */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";

  try {
    const expected = process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
      : new URL(request.url).origin;
    const requestOrigin = new URL(origin).origin;
    if (requestOrigin === expected) return true;
    // Local development may run on any port; accept an origin matching the Host header.
    const host = request.headers.get("host");
    return process.env.NODE_ENV !== "production" && !!host && new URL(requestOrigin).host === host;
  } catch {
    return false;
  }
}

export function getClientAddress(request: Request): string {
  // AWS ALB appends the connecting client address to X-Forwarded-For. Use the
  // last entry, and ensure any upstream proxy is trusted and sanitises this header.
  const chain = request.headers.get("x-forwarded-for")?.split(",").map((part) => part.trim()).filter(Boolean);
  return chain?.at(-1) || request.headers.get("x-real-ip") || "unknown";
}
