import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, canPublish } from "@/lib/auth";
import { createArticle, getCmsArticles } from "@/lib/repository";
import { isSameOriginRequest } from "@/lib/request-security";
import { isAllowedEditorialImageUrl } from "@/lib/image-url";

const galleryImageSchema = z.object({
  src: z.string().trim().min(1).max(2048).refine(isAllowedEditorialImageUrl, "Use a local media-library upload or an approved HTTPS image host."),
  alt: z.string().trim().min(8).max(250),
  credit: z.string().trim().min(3).max(160),
});

const articleSchema = z.object({
  title: z.string().trim().min(5).max(140),
  dek: z.string().trim().min(12).max(280),
  brand: z.enum(["edit", "form"]),
  category: z.string().trim().min(2).max(60),
  body: z.string().trim().min(80).max(30_000),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  galleryImages: z.array(galleryImageSchema).max(12).optional(),
  heroImage: z.string().trim().min(1, "Select an editorial image before saving.").max(2048).refine(isAllowedEditorialImageUrl, "Use a local media-library upload or an approved HTTPS image host."),
  heroAlt: z.string().trim().min(8).max(250),
  imageCredit: z.string().trim().min(3).max(160),
  status: z.enum(["DRAFT", "REVIEW", "SCHEDULED", "PUBLISHED"]).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const articles = await getCmsArticles();
  // Authors see only stories assigned to their account; editors can review the full desk.
  return NextResponse.json({
    articles: session.role === "AUTHOR" ? articles.filter((article) => article.author.slug === session.id) : articles,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Cross-origin mutation is not allowed." }, { status: 403 });

  const parsed = articleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the required fields.", details: parsed.error.flatten() }, { status: 400 });
  if ((parsed.data.status === "SCHEDULED" || parsed.data.status === "PUBLISHED") && !canPublish(session.role)) {
    return NextResponse.json({ error: "Only editors can schedule or publish stories." }, { status: 403 });
  }
  if (parsed.data.status === "SCHEDULED" && !parsed.data.scheduledAt) {
    return NextResponse.json({ error: "Choose a date and time before scheduling." }, { status: 400 });
  }

  try {
    const article = await createArticle({
      ...parsed.data,
      author: { name: session.name, slug: session.id, role: session.role === "AUTHOR" ? "Contributor" : "Editor", bio: "", avatar: "" },
    }, session.name);
    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create article." }, { status: 409 });
  }
}
