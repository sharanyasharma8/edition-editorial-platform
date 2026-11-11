import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, canPublish } from "@/lib/auth";
import { getCmsArticles, updateArticle } from "@/lib/repository";
import { isSameOriginRequest } from "@/lib/request-security";
import { isAllowedEditorialImageUrl } from "@/lib/image-url";

const galleryImageSchema = z.object({
  src: z.string().trim().min(1).max(2048).refine(isAllowedEditorialImageUrl, "Use a local media-library upload or an approved HTTPS image host."),
  alt: z.string().trim().min(8).max(250),
  credit: z.string().trim().min(3).max(160),
});

const patchSchema = z.object({
  title: z.string().trim().min(5).max(140).optional(),
  dek: z.string().trim().min(12).max(280).optional(),
  body: z.string().trim().min(80).max(30_000).optional(),
  category: z.string().trim().min(2).max(60).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  galleryImages: z.array(galleryImageSchema).max(12).optional(),
  heroImage: z.string().trim().min(1, "Select an editorial image before saving.").max(2048).refine(isAllowedEditorialImageUrl, "Use a local media-library upload or an approved HTTPS image host.").optional(),
  heroAlt: z.string().trim().min(8).max(250).optional(),
  imageCredit: z.string().trim().min(3).max(160).optional(),
  status: z.enum(["DRAFT", "REVIEW", "SCHEDULED", "PUBLISHED"]).optional(),
  scheduledAt: z.string().datetime().optional(),
}).superRefine((value, context) => {
  if (value.heroImage !== undefined && value.heroImage !== "" && !value.heroAlt) {
    context.addIssue({ code: "custom", path: ["heroAlt"], message: "Add meaningful alt text when changing the image." });
  }
  if (value.heroImage !== undefined && value.heroImage !== "" && !value.imageCredit) {
    context.addIssue({ code: "custom", path: ["imageCredit"], message: "Add an image credit when changing the image." });
  }
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Cross-origin mutation is not allowed." }, { status: 403 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid update payload.", details: parsed.error.flatten() }, { status: 400 });
  const { id } = await context.params;
  const current = (await getCmsArticles()).find((item) => item.id === id);
  if (!current) return NextResponse.json({ error: "Article not found." }, { status: 404 });
  if (session.role === "AUTHOR" && current.author.slug !== session.id) {
    return NextResponse.json({ error: "You can only edit stories assigned to your account." }, { status: 403 });
  }
  if (session.role === "AUTHOR" && current.status === "PUBLISHED") {
    return NextResponse.json({ error: "Published stories require an editor to approve and apply revisions." }, { status: 403 });
  }
  if ((parsed.data.status === "SCHEDULED" || parsed.data.status === "PUBLISHED") && !canPublish(session.role)) {
    return NextResponse.json({ error: "Only editors can schedule or publish stories." }, { status: 403 });
  }
  if (parsed.data.status === "SCHEDULED" && !parsed.data.scheduledAt) {
    return NextResponse.json({ error: "Choose a date and time before scheduling." }, { status: 400 });
  }

  const article = await updateArticle(id, parsed.data, session.name);
  return article ? NextResponse.json({ article }) : NextResponse.json({ error: "Article not found." }, { status: 404 });
}
