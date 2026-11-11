import "server-only";
import { createSchema } from "graphql-yoga";
import { listArticles, getArticle } from "@/lib/repository";
import type { BrandSlug } from "@/lib/types";
import { normalizePageSize, normalizeSearchTerm } from "@/lib/graphql/limits";

const typeDefs = /* GraphQL */ `
  enum ArticleStatus { DRAFT REVIEW SCHEDULED PUBLISHED }
  type Author { name: String!, slug: String!, role: String!, bio: String!, avatar: String! }
  type GalleryImage { src: String!, alt: String!, credit: String! }
  type Article {
    id: ID!, slug: String!, brand: String!, title: String!, dek: String!, category: String!
    tags: [String!]!, galleryImages: [GalleryImage!]!, heroImage: String!, heroAlt: String!, imageCredit: String!
    author: Author!, publishedAt: String!, updatedAt: String!, readMinutes: Int!, featured: Boolean!
    status: ArticleStatus!, body: String!
  }
  type Query {
    # Reader-facing queries intentionally expose published stories only.
    articles(brand: String, category: String, tag: String, query: String, limit: Int): [Article!]!
    article(brand: String!, slug: String!): Article
  }
`;

const resolvers = { Query: {
  articles: async (_root: unknown, { brand, category, tag, query, limit }: {
    brand?: BrandSlug;
    category?: string;
    tag?: string;
    query?: string;
    limit?: number;
  }) => (await listArticles({
    brand,
    category: category?.slice(0, 60),
    tag: tag?.slice(0, 60),
    query: normalizeSearchTerm(query),
    limit: normalizePageSize(limit),
    status: "PUBLISHED",
  })).map((article) => ({ ...article, galleryImages: article.galleryImages ?? [] })),
  article: async (_root: unknown, { brand, slug }: { brand: BrandSlug; slug: string }) => {
    const article = await getArticle(brand, slug);
    return article ? { ...article, galleryImages: article.galleryImages ?? [] } : null;
  },
} };

export const schema = createSchema({ typeDefs, resolvers });
