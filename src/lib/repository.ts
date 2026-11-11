import "server-only";
import type { Prisma } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";
import seedArticles from "@/data/articles.json";
import type { Article, ArticleStatus, ArticleVersion, BrandSlug } from "@/lib/types";
import { isBrandSlug } from "@/lib/brands";
import { invalidateEditorialCache } from "@/lib/cache";

const localStore = path.join(process.cwd(), "src/data/local-content.json");
const versionStore = path.join(process.cwd(), "src/data/local-versions.json");
const seed = seedArticles as Article[];

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try { return JSON.parse(await fs.readFile(file, "utf8")) as T; }
  catch { return fallback; }
}
async function writeJson<T>(file: string, value: T) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), { encoding: "utf8", flag: "wx" });
  await fs.rename(temporary, file);
}

async function prismaClient() {
  if (process.env.EDITION_USE_DB !== "true") return null;
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required when EDITION_USE_DB=true.");
  // Fail closed when durable storage is configured. Never silently write CMS changes
  // to a local JSON file because a production database is temporarily unavailable.
  const mod = await import("@/lib/prisma");
  return mod.prisma;
}

export async function listArticles(options: {
  brand?: BrandSlug; status?: ArticleStatus; query?: string; category?: string; tag?: string; limit?: number;
} = {}): Promise<Article[]> {
  const prisma = await prismaClient();
  if (prisma) {
    try {
      const rows = await prisma.article.findMany({
        where: {
          ...(options.brand ? { publication: { slug: options.brand } } : {}),
          ...(options.status ? { status: options.status } : { status: "PUBLISHED" }),
          ...(options.category ? { category: { equals: options.category, mode: "insensitive" } } : {}),
          ...(options.tag ? { tags: { has: options.tag } } : {}),
          ...(options.query ? { OR: [
            { title: { contains: options.query, mode: "insensitive" } },
            { dek: { contains: options.query, mode: "insensitive" } },
            { body: { contains: options.query, mode: "insensitive" } },
          ] } : {}),
        },
        include: { author: true, publication: true },
        orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
        ...(options.limit ? { take: options.limit } : {}),
      });
      return rows.map(mapPrismaArticle);
    } catch (error) {
      console.error("[edition] PostgreSQL article query failed.", error);
      throw new Error("Editorial content is temporarily unavailable.");
    }
  }
  let rows = await readJson<Article[]>(localStore, seed);
  rows = rows.filter((article) => {
    if (options.brand && article.brand !== options.brand) return false;
    if (options.status && article.status !== options.status) return false;
    if (!options.status && article.status !== "PUBLISHED") return false;
    if (options.category && article.category.toLowerCase() !== options.category.toLowerCase()) return false;
    if (options.tag && !article.tags.some((tag) => tag.toLowerCase() === options.tag!.toLowerCase())) return false;
    if (options.query) {
      const haystack = `${article.title} ${article.dek} ${article.body} ${article.tags.join(" ")}`.toLowerCase();
      if (!haystack.includes(options.query.toLowerCase())) return false;
    }
    return true;
  }).sort((a, b) => Number(b.featured) - Number(a.featured) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  return options.limit ? rows.slice(0, options.limit) : rows;
}

export async function getArticle(brand: BrandSlug, slug: string): Promise<Article | null> {
  const rows = await listArticles({ brand, status: "PUBLISHED" });
  return rows.find((article) => article.slug === slug) ?? null;
}

export async function getCmsArticles(): Promise<Article[]> {
  const prisma = await prismaClient();
  if (prisma) {
    try {
      const rows = await prisma.article.findMany({ include: { author: true, publication: true }, orderBy: { updatedAt: "desc" } });
      return rows.map(mapPrismaArticle);
    } catch (error) {
      console.error("[edition] PostgreSQL CMS query failed.", error);
      throw new Error("The editorial desk is temporarily unavailable.");
    }
  }
  return readJson<Article[]>(localStore, seed);
}

export async function createArticle(input: Partial<Article> & Pick<Article, "title" | "dek" | "brand" | "category" | "body">, actor: string): Promise<Article> {
  const now = new Date().toISOString();
  const normalizedSlug = (input.slug || input.title).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const article: Article = {
    id: `art-${crypto.randomUUID()}`,
    slug: normalizedSlug,
    brand: input.brand,
    title: input.title.trim(), dek: input.dek.trim(), category: input.category.trim(),
    tags: input.tags ?? [],
    heroImage: input.heroImage ?? "",
    heroAlt: input.heroAlt || "Editorial image awaiting final alt-text review",
    imageCredit: input.imageCredit || "Credit to be confirmed by editor",
    galleryImages: input.galleryImages ?? [],
    author: input.author ?? { name: actor, slug: actor.toLowerCase().replace(/[^a-z0-9]+/g, "-"), role: "Contributor", bio: "", avatar: "" },
    publishedAt: input.status === "PUBLISHED" ? (input.publishedAt || now) : (input.publishedAt || now), scheduledAt: input.scheduledAt, updatedAt: now,
    readMinutes: Math.max(1, Math.ceil(input.body.length / 950)),
    featured: false, status: input.status ?? "DRAFT", body: input.body,
  };
  const prisma = await prismaClient();
  if (prisma) {
    try {
      const publication = await prisma.publication.upsert({ where: { slug: article.brand }, update: {}, create: { slug: article.brand, name: article.brand === "edit" ? "THE EDIT" : "FORM" } });
      const author = await prisma.author.upsert({ where: { slug: article.author.slug }, update: {}, create: { name: article.author.name, slug: article.author.slug, role: article.author.role, bio: article.author.bio, avatar: article.author.avatar } });
      const row = await prisma.article.create({ data: { slug: article.slug, title: article.title, dek: article.dek, category: article.category, tags: article.tags, heroImage: article.heroImage, heroAlt: article.heroAlt, imageCredit: article.imageCredit, galleryImages: (article.galleryImages ?? []) as unknown as Prisma.InputJsonValue, readMinutes: article.readMinutes, featured: article.featured, status: article.status, body: article.body, scheduledAt: article.scheduledAt ? new Date(article.scheduledAt) : null, publishedAt: article.status === "PUBLISHED" ? new Date(now) : null, publicationId: publication.id, authorId: author.id } });
      await invalidateEditorialCache();
      return mapPrismaArticle({ ...row, author, publication });
    } catch (error) {
      console.error("[edition] PostgreSQL article creation failed.", error);
      throw new Error("Could not create the story in the configured database.");
    }
  }
  const rows = await readJson<Article[]>(localStore, seed);
  if (rows.some((item) => item.slug === article.slug && item.brand === article.brand)) throw new Error("An article with this slug already exists in this publication.");
  await writeJson(localStore, [article, ...rows]);
  await invalidateEditorialCache();
  return article;
}

export async function updateArticle(id: string, patch: Partial<Article>, actor: string): Promise<Article | null> {
  const prisma = await prismaClient();
  if (prisma) {
    try {
      const current = await prisma.article.findUnique({ where: { id }, include: { author: true, publication: true } });
      if (!current) return null;
      const updated = await prisma.$transaction(async (tx) => {
        await tx.articleVersion.create({ data: { articleId: id, title: current.title, dek: current.dek, body: current.body, savedBy: actor } });
        return tx.article.update({ where: { id }, data: {
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.dek !== undefined ? { dek: patch.dek } : {}),
          ...(patch.body !== undefined ? { body: patch.body } : {}),
          ...(patch.category !== undefined ? { category: patch.category } : {}),
          ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
          ...(patch.heroImage !== undefined ? { heroImage: patch.heroImage } : {}),
          ...(patch.heroAlt !== undefined ? { heroAlt: patch.heroAlt } : {}),
          ...(patch.imageCredit !== undefined ? { imageCredit: patch.imageCredit } : {}),
          ...(patch.galleryImages !== undefined ? { galleryImages: patch.galleryImages as unknown as Prisma.InputJsonValue } : {}),
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.publishedAt !== undefined ? { publishedAt: new Date(patch.publishedAt) } : patch.status === "PUBLISHED" ? { publishedAt: new Date() } : {}),
          ...(patch.status !== undefined && patch.status !== "SCHEDULED" ? { scheduledAt: null } : patch.scheduledAt ? { scheduledAt: new Date(patch.scheduledAt) } : {}),
          updatedAt: new Date(),
        }, include: { author: true, publication: true } });
      });
      await invalidateEditorialCache();
      return mapPrismaArticle(updated);
    } catch (error) {
      console.error("[edition] PostgreSQL article update failed.", error);
      throw new Error("Could not save the story in the configured database.");
    }
  }
  const rows = await readJson<Article[]>(localStore, seed);
  const index = rows.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const current = rows[index];
  const versions = await readJson<ArticleVersion[]>(versionStore, []);
  versions.unshift({ id: crypto.randomUUID(), articleId: id, title: current.title, dek: current.dek, body: current.body, savedAt: new Date().toISOString(), savedBy: actor });
  await writeJson(versionStore, versions);
  const updated = {
    ...current,
    ...patch,
    ...(patch.status === "PUBLISHED" ? { publishedAt: patch.publishedAt || new Date().toISOString() } : {}),
    ...(patch.status !== undefined && patch.status !== "SCHEDULED" ? { scheduledAt: undefined } : {}),
    updatedAt: new Date().toISOString(),
    readMinutes: Math.max(1, Math.ceil((patch.body ?? current.body).length / 950)),
  };
  rows[index] = updated;
  await writeJson(localStore, rows);
  await invalidateEditorialCache();
  return updated;
}

export async function publishArticle(id: string, actor: string): Promise<Article | null> {
  return updateArticle(id, { status: "PUBLISHED", publishedAt: new Date().toISOString() }, actor);
}

export async function promoteScheduledArticles(): Promise<number> {
  const prisma = await prismaClient();
  if (prisma) {
    const now = new Date();
    try {
      const due = await prisma.article.findMany({
        where: { status: "SCHEDULED", scheduledAt: { lte: now } },
        select: { id: true, title: true, dek: true, body: true },
      });
      let published = 0;
      for (const article of due) {
        // The conditional update is the concurrency gate: if two EventBridge tasks
        // overlap, only the task that changes SCHEDULED -> PUBLISHED records a version.
        const changed = await prisma.$transaction(async (tx) => {
          const result = await tx.article.updateMany({
            where: { id: article.id, status: "SCHEDULED", scheduledAt: { lte: now } },
            data: { status: "PUBLISHED", publishedAt: now, scheduledAt: null, updatedAt: now },
          });
          if (result.count !== 1) return 0;
          await tx.articleVersion.create({
            data: {
              articleId: article.id,
              title: article.title,
              dek: article.dek,
              body: article.body,
              savedBy: "scheduled-publisher",
            },
          });
          return 1;
        });
        published += changed;
      }
      if (published) await invalidateEditorialCache();
      return published;
    } catch (error) {
      console.error("[edition] Scheduled publication batch failed.", error);
      throw new Error("Scheduled stories could not be published.");
    }
  }

  const rows = await getCmsArticles();
  const due = rows.filter((item) => item.status === "SCHEDULED" && item.scheduledAt && Date.parse(item.scheduledAt) <= Date.now());
  let published = 0;
  for (const item of due) { if (await publishArticle(item.id, "scheduled-publisher")) published += 1; }
  return published;
}

export async function getContributors() {
  const prisma = await prismaClient();
  if (prisma) {
    try {
      return await prisma.author.findMany({ orderBy: { name: "asc" } });
    } catch (error) {
      console.error("[edition] Contributor directory query failed.", error);
      throw new Error("Contributor directory is temporarily unavailable.");
    }
  }
  const articles = await getCmsArticles();
  return [...new Map(articles.map((article) => [article.author.slug, article.author])).values()]
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function updateContributor(
  slug: string,
  patch: { name: string; role: string; bio: string; avatar: string },
) {
  const prisma = await prismaClient();
  if (prisma) {
    try {
      const current = await prisma.author.findUnique({ where: { slug } });
      if (!current) return null;
      const updated = await prisma.author.update({ where: { slug }, data: patch });
      await invalidateEditorialCache();
      return updated;
    } catch (error) {
      console.error("[edition] Contributor update failed.", error);
      throw new Error("Could not update the contributor profile.");
    }
  }
  const articles = await getCmsArticles();
  const exists = articles.some((article) => article.author.slug === slug);
  if (!exists) return null;
  const updated = articles.map((article) => article.author.slug === slug
    ? { ...article, author: { ...article.author, ...patch } }
    : article);
  await writeJson(localStore, updated);
  await invalidateEditorialCache();
  return { slug, ...patch };
}

export async function renameEditorialTerm(input: {
  kind: "category" | "tag";
  from: string;
  to: string;
  brand?: BrandSlug;
}): Promise<number> {
  const from = input.from.trim();
  const to = input.to.trim();
  if (!from || !to || from.toLocaleLowerCase() === to.toLocaleLowerCase()) return 0;
  const prisma = await prismaClient();
  if (prisma) {
    try {
      if (input.kind === "category") {
        if (!input.brand) throw new Error("A publication is required when renaming a section.");
        const result = await prisma.article.updateMany({
          where: { category: { equals: from, mode: "insensitive" }, publication: { is: { slug: input.brand } } },
          data: { category: to, updatedAt: new Date() },
        });
        await invalidateEditorialCache();
        return result.count;
      }
      const rows = await prisma.article.findMany({
        where: input.brand ? { publication: { is: { slug: input.brand } } } : {},
        select: { id: true, tags: true },
      });
      const matchingRows = rows.filter((row) => row.tags.some((tag) => tag.toLocaleLowerCase() === from.toLocaleLowerCase()));
      if (matchingRows.length) {
        await prisma.$transaction(matchingRows.map((row) => {
          const normalizedTags: string[] = [];
          for (const tag of row.tags) {
            const nextTag = tag.toLocaleLowerCase() === from.toLocaleLowerCase() ? to : tag;
            if (!normalizedTags.some((existing) => existing.toLocaleLowerCase() === nextTag.toLocaleLowerCase())) {
              normalizedTags.push(nextTag);
            }
          }
          return prisma.article.update({
            where: { id: row.id },
            data: { tags: normalizedTags, updatedAt: new Date() },
          });
        }));
      }
      await invalidateEditorialCache();
      return matchingRows.length;
    } catch (error) {
      console.error("[edition] Taxonomy rename failed.", error);
      throw new Error("Could not rename the editorial term.");
    }
  }

  const articles = await getCmsArticles();
  let changed = 0;
  const updated = articles.map((article) => {
    if (input.kind === "category") {
      if (input.brand === article.brand && article.category.toLocaleLowerCase() === from.toLocaleLowerCase()) {
        changed += 1;
        return { ...article, category: to, updatedAt: new Date().toISOString() };
      }
      return article;
    }
    if (input.brand && article.brand !== input.brand) return article;
    const hasTerm = article.tags.some((tag) => tag.toLocaleLowerCase() === from.toLocaleLowerCase());
    if (!hasTerm) return article;
    changed += 1;
    const tags: string[] = [];
    for (const tag of article.tags) {
      const nextTag = tag.toLocaleLowerCase() === from.toLocaleLowerCase() ? to : tag;
      if (!tags.some((existing) => existing.toLocaleLowerCase() === nextTag.toLocaleLowerCase())) tags.push(nextTag);
    }
    return { ...article, tags, updatedAt: new Date().toISOString() };
  });
  if (changed) {
    await writeJson(localStore, updated);
    await invalidateEditorialCache();
  }
  return changed;
}

export async function getArticleVersions(id: string): Promise<ArticleVersion[]> {
  const prisma = await prismaClient();
  if (prisma) {
    try {
      const rows = await prisma.articleVersion.findMany({ where: { articleId: id }, orderBy: { createdAt: "desc" } });
      return rows.map((row) => ({ id: row.id, articleId: row.articleId, title: row.title, dek: row.dek, body: row.body, savedBy: row.savedBy, savedAt: row.createdAt.toISOString() }));
    } catch (error) {
      console.error("[edition] PostgreSQL version query failed.", error);
      throw new Error("Story history is temporarily unavailable.");
    }
  }
  return (await readJson<ArticleVersion[]>(versionStore, [])).filter((version) => version.articleId === id);
}

interface PrismaArticleRow {
  id: string; slug: string; title: string; dek: string; category: string; tags: string[];
  heroImage: string; heroAlt: string; galleryImages: unknown; imageCredit: string;
  readMinutes: number; featured: boolean; status: Article["status"]; body: string;
  scheduledAt: Date | null; publishedAt: Date | null; updatedAt: Date;
  publication: { slug: string };
  author: { name: string; slug: string; role: string; bio: string; avatar: string };
}

function mapPrismaArticle(row: PrismaArticleRow): Article {
  if (!isBrandSlug(row.publication.slug)) {
    throw new Error(`Unknown publication slug: ${row.publication.slug}`);
  }

  return {
    id: row.id, slug: row.slug, brand: row.publication.slug, title: row.title, dek: row.dek,
    category: row.category, tags: row.tags, heroImage: row.heroImage, heroAlt: row.heroAlt, galleryImages: (row.galleryImages ?? []) as Article["galleryImages"],
    imageCredit: row.imageCredit, author: { name: row.author.name, slug: row.author.slug, role: row.author.role, bio: row.author.bio, avatar: row.author.avatar },
    publishedAt: row.publishedAt?.toISOString() ?? new Date().toISOString(), updatedAt: row.updatedAt.toISOString(),
    readMinutes: row.readMinutes, featured: row.featured, status: row.status, body: row.body, scheduledAt: row.scheduledAt?.toISOString() ?? undefined,
  };
}
