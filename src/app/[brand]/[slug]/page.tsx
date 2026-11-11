import Image from "next/image";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { ArticleRecommendations } from "@/components/ArticleRecommendations";
import { ArticleBody } from "@/components/ArticleBody";
import { ReadingProgress } from "@/components/ReadingProgress";
import { SaveStoryButton } from "@/components/SaveStoryButton";
import { StoryGallery } from "@/components/StoryGallery";
import { isBrandSlug } from "@/lib/brands";
import { queryArticle, queryHomeFeed } from "@/lib/graphql/client";
import type { BrandSlug } from "@/lib/types";
export const revalidate = 300;
export async function generateMetadata({ params }: { params: Promise<{ brand: string; slug: string }> }): Promise<Metadata> {
  const { brand, slug } = await params; if (!isBrandSlug(brand)) return {};
  const article = await queryArticle(brand, slug);
  return article ? { title: article.title, description: article.dek, openGraph: { images: [article.heroImage] } } : {};
}
export default async function ArticlePage({ params }: { params: Promise<{ brand: string; slug: string }> }) {
  const { brand, slug } = await params;
  if (!isBrandSlug(brand)) notFound();
  const publicationSlug = brand as BrandSlug;
  const article = await queryArticle(publicationSlug, slug); if (!article) notFound();
  const all = await queryHomeFeed(publicationSlug);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.dek,
    image: [article.heroImage],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: { "@type": "Person", name: article.author.name, url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://edition.example"}/author/${article.author.slug}` },
    publisher: { "@type": "Organization", name: "EDITION" },
    articleSection: article.category,
    keywords: article.tags.join(", "),
  };
  return <main id="main-content" className={`article-page article-${brand}`}><ReadingProgress />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <div className="article-topline"><Link href={`/${brand}`}><ArrowLeft size={14} /> BACK TO THE JOURNAL</Link><span>{article.category.toUpperCase()} / {new Date(article.publishedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}</span></div>
    <header className="article-header"><div className="article-heading-copy"><span className="eyebrow">{article.category.toUpperCase()} &nbsp;—&nbsp; A FEATURE</span><h1>{article.title}</h1><p className="article-dek">{article.dek}</p><div className="article-byline"><Image src={article.author.avatar} alt="" width={42} height={42} className="author-avatar" /><div><span>WORDS BY {article.author.name.toUpperCase()}</span><small>{article.author.role} &nbsp;·&nbsp; {article.readMinutes} MIN READ</small></div><SaveStoryButton slug={article.slug} /></div></div><div className="article-index-mark">EDITION<br /><span>— 0{Math.max(1, all.findIndex((item) => item.id === article.id) + 1)}</span></div></header>
    <figure className="article-hero-figure"><div className="article-hero-image"><Image src={article.heroImage} alt={article.heroAlt} fill priority sizes="(max-width: 760px) 100vw, 92vw" /></div><figcaption><span>{article.heroAlt}</span><span>{article.imageCredit}</span></figcaption></figure>
    <StoryGallery images={article.galleryImages ?? []} />
    <div className="article-reading-grid"><aside className="article-side-note"><span className="eyebrow">IN THIS STORY</span><p className="article-tag-links">{article.tags.map((tag) => <Link key={tag} href={`/${brand}/tag/${encodeURIComponent(tag.toLowerCase().replace(/\s+/g, "-"))}`}>{tag}</Link>)}</p><div className="article-side-line" /><span className="eyebrow">SHARE</span><a href={`mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent("A story from EDITION: " + article.title)}`}>EMAIL THIS STORY ↗</a></aside><ArticleBody body={article.body} /></div>
    <section className="author-note"><Image src={article.author.avatar} alt="" width={84} height={84} /><div><span className="eyebrow">ABOUT THE AUTHOR</span><h3>{article.author.name}</h3><p>{article.author.bio}</p><Link href={`/author/${article.author.slug}`} className="text-link">MORE FROM THIS AUTHOR <ArrowUpRight size={13} /></Link></div></section>
    <Suspense fallback={<div className="related-loading"><span className="eyebrow">CONTINUE READING</span><p>Finding a related perspective…</p></div>}><ArticleRecommendations brand={publicationSlug} currentId={article.id} category={article.category} tags={article.tags} /></Suspense>
  </main>;
}
