import { describe, expect, it, vi } from "vitest";
import { createYoga } from "graphql-yoga";

vi.mock("@/lib/repository", () => ({
  listArticles: vi.fn(async () => [{
    id: "1", slug: "a", brand: "edit", title: "A", dek: "d", category: "c", tags: [], heroImage: "/h.jpg", heroAlt: "h",
    imageCredit: "x", author: { name: "N", slug: "n", role: "r", bio: "b", avatar: "/a.jpg" }, publishedAt: "2026-01-01",
    updatedAt: "2026-01-01", readMinutes: 1, featured: false, status: "PUBLISHED", body: "b",
  }]),
  getArticle: vi.fn(async () => null),
}));

describe("GraphQL schema", () => {
  it("resolves queries through the Yoga HTTP handler (no rootValue)", async () => {
    const { schema } = await import("@/lib/graphql/schema");
    const yoga = createYoga({ schema, graphqlEndpoint: "/api/graphql" });
    const response = await yoga.fetch("http://localhost/api/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: '{ articles(brand: "edit") { slug author { name } } article(brand: "edit", slug: "x") { slug } }' }),
    });
    const json = await response.json();
    expect(json.errors).toBeUndefined();
    expect(json.data.articles[0]).toEqual({ slug: "a", author: { name: "N" } });
    expect(json.data.article).toBeNull();
  });
});
