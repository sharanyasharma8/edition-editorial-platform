import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";
import articles from "../src/data/articles.json";
import type { Article } from "../src/lib/types";
const prisma = new PrismaClient();
function passwordHash(password: string) {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64).toString("base64url");
  return `scrypt$${salt.toString("base64url")}$${derived}`;
}
async function main() {
  for (const brand of ["edit", "form"]) {
    const publication = await prisma.publication.upsert({ where: { slug: brand }, update: {}, create: { slug: brand, name: brand === "edit" ? "THE EDIT" : "FORM" } });
    for (const raw of articles.filter((item) => item.brand === brand) as unknown as Array<Article & { author: Article["author"] }>) {
      const author = await prisma.author.upsert({ where: { slug: raw.author.slug }, update: {}, create: raw.author });
      await prisma.article.upsert({
        where: { publicationId_slug: { publicationId: publication.id, slug: raw.slug } },
        update: {},
        create: { slug: raw.slug, title: raw.title, dek: raw.dek, category: raw.category, tags: raw.tags, heroImage: raw.heroImage, heroAlt: raw.heroAlt, imageCredit: raw.imageCredit, readMinutes: raw.readMinutes, featured: raw.featured, status: "PUBLISHED", body: raw.body, publishedAt: new Date(raw.publishedAt), publicationId: publication.id, authorId: author.id },
      });
    }
  }
  const editor = process.env.DEMO_EDITOR_EMAIL ?? "editor@edition.studio";
  const author = process.env.DEMO_AUTHOR_EMAIL ?? "author@edition.studio";
  const editorPassword = process.env.DEMO_EDITOR_PASSWORD;
  const authorPassword = process.env.DEMO_AUTHOR_PASSWORD;
  if (!editorPassword || !authorPassword || editorPassword.length < 12 || authorPassword.length < 12) {
    throw new Error("Set DEMO_EDITOR_PASSWORD and DEMO_AUTHOR_PASSWORD to unique values of at least 12 characters before seeding.");
  }
  await prisma.user.upsert({
    where: { email: editor.toLowerCase() },
    update: { name: "Edition Editor", role: "EDITOR", passwordHash: passwordHash(editorPassword) },
    create: { email: editor.toLowerCase(), name: "Edition Editor", role: "EDITOR", passwordHash: passwordHash(editorPassword) },
  });
  await prisma.user.upsert({
    where: { email: author.toLowerCase() },
    update: { name: "Edition Contributor", role: "AUTHOR", passwordHash: passwordHash(authorPassword) },
    create: { email: author.toLowerCase(), name: "Edition Contributor", role: "AUTHOR", passwordHash: passwordHash(authorPassword) },
  });
  console.log("EDITION seed complete.");
}
main()
  .catch((error) => {
    console.error("EDITION seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
