import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getCmsArticles } from "@/lib/repository";
import { StudioLogin } from "@/components/StudioLogin";
import { ArticlePreview } from "@/components/ArticlePreview";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Private story preview — Editorial Studio", robots: { index: false, follow: false, noarchive: true } };

export default async function StoryPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return <StudioLogin />;
  const { id } = await params;
  const article = (await getCmsArticles()).find((item) => item.id === id);
  if (!article || (user.role === "AUTHOR" && article.author.slug !== user.id)) notFound();

  return (
    <div className={`publication-shell theme-${article.brand}`}>
      <SiteHeader brand={article.brand} />
      <div className="private-preview-banner">
        <Link href={`/studio/stories/${article.id}/edit`}><ArrowLeft size={14} /> RETURN TO EDITOR</Link>
        <span>PRIVATE PREVIEW · NOT VISIBLE TO READERS</span>
        <span>{article.status}</span>
      </div>
      <ArticlePreview article={article} />
      <SiteFooter brand={article.brand} />
    </div>
  );
}
