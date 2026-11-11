import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { SessionUser, UserRole } from "@/lib/types";

const COOKIE = "edition_session";
const DEV_SECRET = "local-edition-development-secret-change-before-deployment";

function getSessionSecret() {
  const configured = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production" && (!configured || configured.length < 32)) {
    throw new Error("SESSION_SECRET must contain at least 32 characters in production.");
  }
  const value = configured || DEV_SECRET;
  if (value.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters.");
  return new TextEncoder().encode(value);
}


function hashPassword(password: string, salt: Buffer) {
  return scryptSync(password, salt, 64).toString("base64url");
}

export function createPasswordHash(password: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("base64url")}$${hashPassword(password, salt)}`;
}

function verifyPassword(password: string, encoded: string) {
  const [algorithm, saltPart, hashPart] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltPart || !hashPart) return false;
  try {
    const salt = Buffer.from(saltPart, "base64url");
    const expected = Buffer.from(hashPart, "base64url");
    const actual = Buffer.from(hashPassword(password, salt), "base64url");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export async function authenticateCredentials(email: string, password: string): Promise<SessionUser | null> {
  if (process.env.EDITION_USE_DB === "true") {
    // Database-enabled deployments fail closed: an unavailable user store must never
    // silently fall back to hard-coded demo credentials.
    const { prisma } = await import("@/lib/prisma");
    const account = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!account || !verifyPassword(password, account.passwordHash)) return null;
    return { id: account.id, email: account.email, name: account.name, role: account.role };
  }

  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DEMO_AUTH !== "true") return null;
  const accounts = [
    { email: process.env.DEMO_EDITOR_EMAIL || "editor@edition.studio", password: process.env.DEMO_EDITOR_PASSWORD || "edition-demo-pass", id: "demo-editor", name: "Edition Editor", role: "EDITOR" as const },
    { email: process.env.DEMO_AUTHOR_EMAIL || "author@edition.studio", password: process.env.DEMO_AUTHOR_PASSWORD || "author-demo-pass", id: "demo-author", name: "Edition Contributor", role: "AUTHOR" as const },
  ];
  const account = accounts.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password);
  return account ? { id: account.id, email: account.email, name: account.name, role: account.role } : null;
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSessionSecret());
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true" || (process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false"),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), { algorithms: ["HS256"] });
    if (
      typeof payload.id !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      !["AUTHOR", "EDITOR", "ADMIN"].includes(String(payload.role))
    ) return null;
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export function canPublish(role: UserRole) {
  return role === "EDITOR" || role === "ADMIN";
}
