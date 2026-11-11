import { NextResponse } from "next/server";
import { z } from "zod";
import { canPublish, getSession } from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/request-security";
import { isAllowedEditorialImageUrl } from "@/lib/image-url";
import { updateContributor } from "@/lib/repository";

const contributorSchema = z.object({
  name: z.string().trim().min(2).max(80),
  role: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(1_200),
  avatar: z.string().trim().max(2_048).refine(isAllowedEditorialImageUrl, "Use a local upload or approved HTTPS image host."),
});

export async function PATCH(request: Request, context: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!canPublish(session.role)) return NextResponse.json({ error: "Editor permissions are required." }, { status: 403 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Cross-origin mutation is not allowed." }, { status: 403 });
  const parsed = contributorSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the contributor profile fields.", details: parsed.error.flatten() }, { status: 400 });
  const { slug } = await context.params;
  try {
    const contributor = await updateContributor(slug, parsed.data);
    return contributor
      ? NextResponse.json({ contributor })
      : NextResponse.json({ error: "Contributor not found." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update contributor." }, { status: 503 });
  }
}
