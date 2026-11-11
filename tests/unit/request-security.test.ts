import { afterEach, describe, expect, it, vi } from "vitest";
import { getClientAddress, isSameOriginRequest } from "@/lib/request-security";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("request security helpers", () => {
  it("requires a matching origin in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://edition.example");
    expect(isSameOriginRequest(new Request("https://edition.example/api/cms/articles", {
      method: "POST",
      headers: { origin: "https://edition.example" },
    }))).toBe(true);
    expect(isSameOriginRequest(new Request("https://edition.example/api/cms/articles", {
      method: "POST",
      headers: { origin: "https://attacker.example" },
    }))).toBe(false);
    expect(isSameOriginRequest(new Request("https://edition.example/api/cms/articles", { method: "POST" }))).toBe(false);
  });

  it("uses the connecting client address at the end of an ALB forwarded chain", () => {
    const request = new Request("https://edition.example/api/auth/login", {
      headers: { "x-forwarded-for": "198.51.100.99, 203.0.113.42" },
    });
    expect(getClientAddress(request)).toBe("203.0.113.42");
  });

  it("accepts a matching Host header outside production so dev works on any port", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    const request = new Request("http://localhost:3111/api/auth/login", {
      method: "POST",
      headers: { origin: "http://localhost:3111", host: "localhost:3111" },
    });
    expect(isSameOriginRequest(request)).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    expect(isSameOriginRequest(request)).toBe(false);
  });
});
