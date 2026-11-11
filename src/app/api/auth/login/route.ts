import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateCredentials, createSession } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/cache";
import { getClientAddress, isSameOriginRequest } from "@/lib/request-security";

const schema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(256) });

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Cross-origin sign-in is not allowed." }, { status: 403 });
  }

  const limit = await consumeRateLimit(`login:${getClientAddress(request)}`, 8, 15 * 60);
  if (limit.unavailable) {
    return NextResponse.json({ error: "Sign-in protection is temporarily unavailable. Please retry shortly." }, { status: 503 });
  }
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many sign-in attempts. Try again later." }, {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    });
  }

  const payload = schema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });

  try {
    const user = await authenticateCredentials(payload.data.email, payload.data.password);
    if (!user) return NextResponse.json({ error: "Those credentials did not match." }, { status: 401 });
    await createSession(user);
    return NextResponse.json({ user: { email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    console.error("[edition] Authentication service failed.", error);
    return NextResponse.json({ error: "Sign-in is temporarily unavailable." }, { status: 503 });
  }
}
