import { NextResponse } from "next/server";
import { getSession, canPublish } from "@/lib/auth";
import { publishArticle } from "@/lib/repository";
import { isSameOriginRequest } from "@/lib/request-security";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Cross-origin mutation is not allowed." }, { status: 403 });
  if (!canPublish(session.role)) return NextResponse.json({ error: "Publishing requires editor permissions." }, { status: 403 });
  const { id } = await context.params;
  const article = await publishArticle(id, session.name);
  return article ? NextResponse.json({ article }) : NextResponse.json({ error: "Article not found." }, { status: 404 });
}
