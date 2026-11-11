import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getArticleVersions, getCmsArticles } from "@/lib/repository";
import { StudioLogin } from "@/components/StudioLogin";
export default async function VersionHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(); if (!user) return <StudioLogin />;
  const { id } = await params; const article = (await getCmsArticles()).find((item) => item.id === id); if (!article || (user.role === "AUTHOR" && article.author.slug !== user.id)) notFound();
  const versions = await getArticleVersions(id);
  return <main className="version-page"><Link href={`/studio/stories/${id}/edit`} className="back-link"><ArrowLeft size={14} /> BACK TO STORY</Link><span className="eyebrow">EDITORIAL CONTROL / VERSION HISTORY</span><h1>{article.title}<span>.</span></h1><p>Saved snapshots are retained before each edit. Restore is intentionally not automatic in this demo; compare and reapply content with editorial review.</p><div className="version-list">{versions.length ? versions.map((version, index) => <article key={version.id}><div><span className="eyebrow">VERSION {String(versions.length - index).padStart(2, "0")}</span><h2>{version.title}</h2><small>{new Date(version.savedAt).toLocaleString("en-IN")} · Saved by {version.savedBy}</small></div><p>{version.dek}</p><details><summary>VIEW SAVED BODY</summary><pre>{version.body}</pre></details></article>) : <div className="empty-state"><span>NO PREVIOUS VERSIONS</span><p>A snapshot is created each time this story is updated.</p></div>}</div></main>;
}
