import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { ArticleCard } from "@/components/ArticleCard";
import { isBrandSlug, PUBLICATIONS } from "@/lib/brands";
import { queryCategoryFeed } from "@/lib/graphql/client";
import type { BrandSlug } from "@/lib/types";
export async function generateMetadata({ params }: { params: Promise<{ brand: string; slug: string }> }): Promise<Metadata> { const { brand, slug } = await params; return isBrandSlug(brand) ? { title: `${slug} — ${PUBLICATIONS[brand].name}` } : {}; }
export default async function CategoryPage({ params }: { params: Promise<{ brand: string; slug: string }> }) {
  const { brand, slug } = await params; if (!isBrandSlug(brand)) notFound();
  const category = decodeURIComponent(slug).replace(/-/g, " "); const stories = await queryCategoryFeed(brand as BrandSlug, category);
  return <main id="main-content" className={`category-page category-${brand}`}><header className="category-head"><span className="eyebrow">THE JOURNAL / {PUBLICATIONS[brand].name}</span><h1>{category}<span>.</span></h1><p>A considered collection of stories, perspectives and observations from the {PUBLICATIONS[brand].name} journal.</p><Link href={`/${brand}/search`} className="text-link">SEARCH THE JOURNAL <ArrowUpRight size={14} /></Link></header>
    {stories.length ? <div className="category-grid">{stories.map((article, index) => <ArticleCard key={article.id} article={article} brand={brand as BrandSlug} index={index} />)}</div> : <div className="empty-state"><span>THIS SECTION IS QUIET FOR NOW.</span><p>Explore the rest of the journal while new stories take shape.</p><Link href={`/${brand}`} className="text-link">RETURN TO THE JOURNAL <ArrowUpRight size={14} /></Link></div>}</main>;
}
