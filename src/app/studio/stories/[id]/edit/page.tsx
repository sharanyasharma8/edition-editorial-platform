import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getCmsArticles } from "@/lib/repository";
import { StudioLogin } from "@/components/StudioLogin";
import { ArticleEditor } from "@/components/ArticleEditor";
export default async function EditStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(); if (!user) return <StudioLogin />;
  const { id } = await params; const article = (await getCmsArticles()).find((item) => item.id === id);
  if (!article || (user.role === "AUTHOR" && (article.author.slug !== user.id || article.status === "PUBLISHED"))) notFound();
  return <div className="studio-editor-page"><ArticleEditor initialArticle={article} canPublish={user.role !== "AUTHOR"} /></div>;
}
