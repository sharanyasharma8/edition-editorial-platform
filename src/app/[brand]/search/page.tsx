import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SearchExperience } from "@/components/SearchExperience";
import { isBrandSlug, PUBLICATIONS } from "@/lib/brands";
import { querySearchFeed } from "@/lib/graphql/client";
import type { BrandSlug } from "@/lib/types";
export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }): Promise<Metadata> { const { brand } = await params; return isBrandSlug(brand) ? { title: `Search — ${PUBLICATIONS[brand].name}` } : {}; }
export default async function SearchPage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand } = await params; if (!isBrandSlug(brand)) notFound();
  const stories = await querySearchFeed(brand as BrandSlug);
  return <main id="main-content" className={`search-page search-${brand}`}><header className="search-page-heading"><span className="eyebrow">THE JOURNAL / INDEX</span><h1>Find your<br /><em>perspective.</em></h1><p>Search the stories, people and ideas that make up {PUBLICATIONS[brand].name}.</p></header><SearchExperience articles={stories} brand={brand as BrandSlug} categories={PUBLICATIONS[brand].categories} /></main>;
}
