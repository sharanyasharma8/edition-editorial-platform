"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, ArrowUpRight, SlidersHorizontal } from "lucide-react";
import type { Article, BrandSlug } from "@/lib/types";
export function SearchExperience({ articles, brand, categories }: { articles: Article[]; brand: BrandSlug; categories: string[] }) {
  const [query, setQuery] = useState(""); const [category, setCategory] = useState("All stories");
  const results = useMemo(() => articles.filter((item) => {
    const matchCategory = category === "All stories" || item.category === category;
    const text = `${item.title} ${item.dek} ${item.author.name} ${item.tags.join(" ")}`.toLowerCase();
    return matchCategory && (!query || text.includes(query.toLowerCase()));
  }), [articles, category, query]);
  return <div className="search-experience">
    <label className="search-field"><Search size={22} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search stories, people, ideas…" aria-label="Search editorial stories" autoFocus /></label>
    <div className="search-controls"><span><SlidersHorizontal size={14} /> FILTER BY SECTION</span><div className="filter-pills"><button className={category === "All stories" ? "active" : ""} onClick={() => setCategory("All stories")}>ALL STORIES</button>{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item.toUpperCase()}</button>)}</div></div>
    <div className="search-count">{results.length} {results.length === 1 ? "STORY" : "STORIES"} FOUND</div>
    {results.length ? <div className="search-results">{results.map((article) => <article key={article.id} className="search-result"><Link href={`/${brand}/${article.slug}`}><Image src={article.heroImage} alt={article.heroAlt} width={260} height={180} /><div><span className="eyebrow">{article.category} · {article.readMinutes} MIN READ</span><h3>{article.title}</h3><p>{article.dek}</p><span className="text-link">READ STORY <ArrowUpRight size={13} /></span></div></Link></article>)}</div> : <div className="empty-state"><span>NO MATCHES, JUST POSSIBILITY.</span><p>Try a different word or clear the section filter.</p><button onClick={() => { setQuery(""); setCategory("All stories"); }}>CLEAR SEARCH</button></div>}
  </div>;
}
