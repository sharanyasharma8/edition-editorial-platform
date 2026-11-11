import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getArticleVersions, getCmsArticles } from "@/lib/repository";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await context.params;
  const article = (await getCmsArticles()).find((item) => item.id === id);
  if (!article) return NextResponse.json({ error: "Article not found." }, { status: 404 });
  if (session.role === "AUTHOR" && article.author.slug !== session.id) {
    return NextResponse.json({ error: "You cannot view the history of another contributor's story." }, { status: 403 });
  }
  return NextResponse.json({ versions: await getArticleVersions(id) });
}
