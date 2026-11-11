import type { MetadataRoute } from "next";
import { listArticles } from "@/lib/repository";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const pages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/edit`, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/form`, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/edit/search`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/form/search`, changeFrequency: "weekly", priority: 0.5 },
  ];
  const articles = await listArticles({ status: "PUBLISHED", limit: 1_000 });
  const stories = articles.map((article) => ({
    url: `${baseUrl}/${article.brand}/${article.slug}`,
    lastModified: new Date(article.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
  return [...pages, ...stories];
}
