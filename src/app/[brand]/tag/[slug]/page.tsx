import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { ArticleCard } from "@/components/ArticleCard";
import { isBrandSlug, PUBLICATIONS } from "@/lib/brands";
import { queryTagFeed } from "@/lib/graphql/client";
import type { BrandSlug } from "@/lib/types";
export default async function TagPage({ params }: { params: Promise<{ brand: string; slug: string }> }) {
  const { brand, slug } = await params; if (!isBrandSlug(brand)) notFound();
  const tag = decodeURIComponent(slug).replace(/-/g, " "); const stories = await queryTagFeed(brand as BrandSlug, tag);
  return <main id="main-content" className={`category-page category-${brand}`}><header className="category-head"><span className="eyebrow">THE JOURNAL / TOPIC INDEX</span><h1>#{tag}<span>.</span></h1><p>Stories connected by a shared idea, across the {PUBLICATIONS[brand].name} journal.</p><Link href={`/${brand}/search`} className="text-link">SEARCH THE JOURNAL <ArrowUpRight size={14} /></Link></header>{stories.length ? <div className="category-grid">{stories.map((article, index) => <ArticleCard key={article.id} article={article} brand={brand as BrandSlug} index={index} />)}</div> : <div className="empty-state"><span>NO STORIES TAGGED HERE YET.</span><p>Explore other ideas in the journal.</p><Link href={`/${brand}`} className="text-link">RETURN TO THE JOURNAL ↗</Link></div>}</main>;
}
