import "server-only";
import { graphql } from "graphql";
import { schema } from "@/lib/graphql/schema";
import { cached } from "@/lib/cache";
import type { Article, BrandSlug } from "@/lib/types";
import { HOME_FEED_QUERY, ARTICLE_QUERY, CATEGORY_FEED_QUERY, TAG_FEED_QUERY } from "@/lib/graphql/queries";
import { GRAPHQL_MAX_PAGE_SIZE } from "@/lib/graphql/limits";

async function execute<T>(source: string, variableValues: Record<string, unknown>): Promise<T> {
  const result = await graphql({ schema, source, variableValues });
  if (result.errors?.length) throw new Error(result.errors.map((e) => e.message).join("; "));
  // graphql-js returns null-prototype objects, which React cannot serialise across
  // the Server → Client Component boundary. Normalise to plain JSON objects.
  return JSON.parse(JSON.stringify(result.data)) as T;
}
export async function queryHomeFeed(brand: BrandSlug): Promise<Article[]> {
  return cached(`graphql:edition:home:${brand}`, 120, async () => {
    const result = await execute<{ articles: Article[] }>(HOME_FEED_QUERY, { brand, limit: 12 });
    return result.articles;
  });
}
export async function queryCategoryFeed(brand: BrandSlug, category: string): Promise<Article[]> {
  return cached(`graphql:edition:category:${brand}:${category.toLowerCase()}`, 120, async () => {
    const result = await execute<{ articles: Article[] }>(CATEGORY_FEED_QUERY, { brand, category, limit: 24 });
    return result.articles;
  });
}
export async function queryArticle(brand: BrandSlug, slug: string): Promise<Article | null> {
  return cached(`graphql:edition:article:${brand}:${slug}`, 120, async () => {
    const result = await execute<{ article: Article | null }>(ARTICLE_QUERY, { brand, slug });
    return result.article;
  });
}

export async function queryTagFeed(brand: BrandSlug, tag: string): Promise<Article[]> {
  return cached(`graphql:edition:tag:${brand}:${tag.toLowerCase()}`, 120, async () => {
    const result = await execute<{ articles: Article[] }>(TAG_FEED_QUERY, { brand, tag, limit: 24 });
    return result.articles;
  });
}

/** Search loads a larger, still bounded slice than the homepage lead feed. */
export async function querySearchFeed(brand: BrandSlug): Promise<Article[]> {
  return cached(`graphql:edition:search:${brand}`, 120, async () => {
    const result = await execute<{ articles: Article[] }>(HOME_FEED_QUERY, { brand, limit: GRAPHQL_MAX_PAGE_SIZE });
    return result.articles;
  });
}
