export type BrandSlug = "edit" | "form";
export type UserRole = "AUTHOR" | "EDITOR" | "ADMIN";
export type ArticleStatus = "DRAFT" | "REVIEW" | "SCHEDULED" | "PUBLISHED";

export interface Publication {
  slug: BrandSlug;
  name: string;
  descriptor: string;
  tagline: string;
  description: string;
  categories: string[];
}

export interface Author {
  name: string;
  slug: string;
  role: string;
  bio: string;
  avatar: string;
}

export interface GalleryImage {
  src: string;
  alt: string;
  credit: string;
}

export interface Article {
  id: string;
  slug: string;
  brand: BrandSlug;
  title: string;
  dek: string;
  category: string;
  tags: string[];
  heroImage: string;
  heroAlt: string;
  imageCredit: string;
  galleryImages?: GalleryImage[];
  author: Author;
  publishedAt: string;
  scheduledAt?: string;
  updatedAt: string;
  readMinutes: number;
  featured: boolean;
  status: ArticleStatus;
  body: string;
}

export interface ArticleVersion {
  id: string;
  articleId: string;
  title: string;
  dek: string;
  body: string;
  savedAt: string;
  savedBy: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
