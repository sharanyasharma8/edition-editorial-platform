import { describe, expect, it } from "vitest";
import {
  GRAPHQL_DEFAULT_PAGE_SIZE,
  GRAPHQL_MAX_PAGE_SIZE,
  GRAPHQL_MAX_SEARCH_LENGTH,
  normalizePageSize,
  normalizeSearchTerm,
} from "@/lib/graphql/limits";

describe("public GraphQL argument guardrails", () => {
  it("uses a bounded default page size", () => {
    expect(normalizePageSize()).toBe(GRAPHQL_DEFAULT_PAGE_SIZE);
  });

  it("clamps requested page sizes to the supported range", () => {
    expect(normalizePageSize(0)).toBe(1);
    expect(normalizePageSize(-5)).toBe(1);
    expect(normalizePageSize(10_000)).toBe(GRAPHQL_MAX_PAGE_SIZE);
    expect(normalizePageSize(4.8)).toBe(4);
  });

  it("normalizes blank and excessive search terms", () => {
    expect(normalizeSearchTerm("   ")).toBeUndefined();
    expect(normalizeSearchTerm("  studio  ")).toBe("studio");
    expect(normalizeSearchTerm("x".repeat(400))).toHaveLength(GRAPHQL_MAX_SEARCH_LENGTH);
    expect(normalizeSearchTerm(undefined)).toBeUndefined();
  });
});
