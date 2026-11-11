import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { ArticleCard } from "@/components/ArticleCard";
import { getPublication, isBrandSlug, PUBLICATIONS } from "@/lib/brands";
import { queryHomeFeed } from "@/lib/graphql/client";
import type { BrandSlug } from "@/lib/types";
export const revalidate = 300;
export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }): Promise<Metadata> {
  const { brand } = await params; const publication = getPublication(brand);
  return publication ? { title: publication.name, description: publication.description } : {};
}
export default async function PublicationHome({ params }: { params: Promise<{ brand: string }> }) {
  const { brand } = await params; if (!isBrandSlug(brand)) notFound();
  const publication = PUBLICATIONS[brand];
  const stories = await queryHomeFeed(brand as BrandSlug);
  const hero = stories.find((story) => story.featured) ?? stories[0];
  const secondary = stories.filter((story) => story.id !== hero?.id);
  if (!hero) return <main id="main-content" className="empty-state"><h1>Stories are taking shape.</h1><p>Check back soon.</p></main>;
  const isEdit = brand === "edit";
  return <main id="main-content" className={`home-page home-${brand}`}>
    <section className={`home-intro intro-${brand}`}><div><span className="eyebrow">{isEdit ? "THE JOURNAL OF WHAT MOVES US" : "THE JOURNAL OF WHAT MOVES US FORWARD"}</span><p>{publication.tagline}</p></div><div className="intro-note">{publication.descriptor}<span>EST. MMXXVI&nbsp; / &nbsp;VOL. 01</span></div></section>
    <section className={`hero-story hero-${brand}`} aria-labelledby="hero-title"><Link href={`/${brand}/${hero.slug}`} className="hero-image-link"><Image src={hero.heroImage} alt={hero.heroAlt} fill priority sizes="100vw" className="hero-image" /></Link><div className="hero-shade" /><div className="hero-overlay"><div className="hero-kicker"><span>THE LEAD STORY</span><span>01 / {String(Math.max(1, stories.length)).padStart(2, "0")}</span></div><div className="hero-copy"><span className="hero-category">{hero.category.toUpperCase()} <span>—</span> {hero.readMinutes} MIN READ</span><h1 id="hero-title"><Link href={`/${brand}/${hero.slug}`}>{hero.title}</Link></h1><p>{hero.dek}</p><Link href={`/${brand}/${hero.slug}`} className="hero-cta">READ THE STORY <ArrowUpRight size={17} /></Link></div></div><span className="hero-image-credit">IMAGE · {hero.imageCredit}</span></section>
    <section className="lead-in-grid"><div className="lead-label"><span className="eyebrow">THE LATEST</span><p>Stories and ideas<br />to spend time with.</p><span className="vertical-index">A MORE CONSIDERED SCROLL ↓</span></div><div className="lead-feature">{secondary[0] && <ArticleCard article={secondary[0]} brand={brand as BrandSlug} variant="feature" index={0} />}</div><div className="lead-side">{secondary.slice(1, 3).map((article, index) => <ArticleCard key={article.id} article={article} brand={brand as BrandSlug} variant="compact" index={index + 1} />)}</div></section>
    <section className="editorial-rule"><span>{isEdit ? "A DIFFERENT KIND OF COVERAGE" : "A DIFFERENT KIND OF SPACE"}</span><i>{isEdit ? "Style is a way of seeing." : "Form follows feeling."}</i><span>EDITION / 2026</span></section>
    <section className="story-index"><div className="section-heading"><div><span className="eyebrow">FROM THE JOURNAL</span><h2>{isEdit ? <>The conversation<br /><em>continues.</em></> : <>Ideas made<br /><em>visible.</em></>}</h2></div><Link href={`/${brand}/search`} className="text-link">EXPLORE ALL STORIES <ArrowUpRight size={14} /></Link></div><div className="story-grid">{secondary.slice(3).map((article, index) => <ArticleCard key={article.id} article={article} brand={brand as BrandSlug} index={index + 3} />)}</div></section>
    <section className={`newsletter-band newsletter-${brand}`}><div><span className="eyebrow">THE EDITION LETTER</span><h2>A little more<br /><em>consideration.</em></h2></div><div><p>A periodic note on the stories, people and ideas we can’t stop thinking about. No noise, just perspective.</p><a href="mailto:letters@edition.studio?subject=Subscribe%20to%20the%20EDITION%20letter" className="newsletter-link">JOIN THE LETTER <ArrowUpRight size={15} /></a></div></section>
    <div className="home-endmark"><span>END OF ISSUE</span><ChevronDown size={17} /><span>MORE SOON</span></div>
  </main>;
}
