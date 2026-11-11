import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/ArticleCard";
import { listArticles } from "@/lib/repository";
export default async function AuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const all = await listArticles(); const stories = all.filter((article) => article.author.slug === slug); if (!stories.length) notFound();
  const author = stories[0].author;
  return <main id="main-content" className="author-page"><div className="author-profile"><Image src={author.avatar} alt="" width={150} height={150} /><div><span className="eyebrow">CONTRIBUTOR / EDITION JOURNALS</span><h1>{author.name}<span>.</span></h1><p className="author-role">{author.role}</p><p>{author.bio}</p><Link href={`/${stories[0].brand}`} className="text-link">BACK TO THE JOURNAL ↗</Link></div></div><div className="section-heading"><div><span className="eyebrow">SELECTED WRITING</span><h2>Stories by <em>{author.name.split(" ")[0]}.</em></h2></div></div><div className="category-grid">{stories.map((article, index) => <ArticleCard key={article.id} article={article} brand={article.brand} index={index} />)}</div></main>;
}
