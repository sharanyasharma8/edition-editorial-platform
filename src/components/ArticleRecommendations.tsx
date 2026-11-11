import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ArticleCard } from "@/components/ArticleCard";
import { queryHomeFeed } from "@/lib/graphql/client";
import type { BrandSlug } from "@/lib/types";
export async function ArticleRecommendations({ brand, currentId, category, tags }: { brand: BrandSlug; currentId: string; category: string; tags: string[] }) {
  const articles = await queryHomeFeed(brand);
  const related = articles.filter((item) => item.id !== currentId && (item.category === category || item.tags.some((tag) => tags.includes(tag)))).slice(0, 2);
  if (!related.length) return null;
  return <section className="related-stories"><div className="section-heading"><div><span className="eyebrow">CONTINUE READING</span><h2>Stay with the <em>story.</em></h2></div><Link href={`/${brand}/search`} className="text-link">ALL STORIES <ArrowUpRight size={13} /></Link></div><div className="related-grid">{related.map((item, index) => <ArticleCard key={item.id} article={item} brand={brand} index={index} />)}</div></section>;
}
