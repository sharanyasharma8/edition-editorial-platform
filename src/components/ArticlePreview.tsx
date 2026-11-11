"use client";

import Image from "next/image";
import type { Article } from "@/lib/types";
import { isAllowedEditorialImageUrl } from "@/lib/image-url";
import { ArticleBody } from "@/components/ArticleBody";
import { StoryGallery } from "@/components/StoryGallery";

export function ArticlePreview({ article }: { article: Article }) {
  const previewImage = isAllowedEditorialImageUrl(article.heroImage)
    ? article.heroImage
    : "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1800&q=80";
  return (
    <main id="main-content" className={`article-page article-${article.brand} article-preview-content`}>
      <div className="article-topline">
        <span>PRIVATE EDITORIAL PREVIEW</span>
        <span>{article.category.toUpperCase()} / {article.readMinutes} MIN READ</span>
      </div>
      <header className="article-header">
        <div className="article-heading-copy">
          <span className="eyebrow">{article.category.toUpperCase()} &nbsp;—&nbsp; {article.brand === "edit" ? "THE EDIT" : "FORM"} PREVIEW</span>
          <h1>{article.title || "Untitled story"}</h1>
          <p className="article-dek">{article.dek || "Your stand-first will appear here."}</p>
          <div className="article-byline">
            {article.author.avatar ? <Image src={article.author.avatar} alt="" width={42} height={42} className="author-avatar" /> : null}
            <div><span>WORDS BY {article.author.name.toUpperCase()}</span><small>{article.author.role} &nbsp;·&nbsp; {article.readMinutes} MIN READ</small></div>
          </div>
        </div>
        <div className="article-index-mark">EDITION<br /><span>— PREVIEW</span></div>
      </header>
      <figure className="article-hero-figure">
        <div className="article-hero-image">
          <Image src={previewImage} alt={article.heroAlt} fill priority sizes="(max-width: 760px) 100vw, 92vw" />
        </div>
        <figcaption><span>{article.heroAlt}</span><span>{article.imageCredit}</span></figcaption>
      </figure>
      <StoryGallery images={article.galleryImages ?? []} />
      <div className="article-reading-grid">
        <aside className="article-side-note"><span className="eyebrow">STORY STATUS</span><p>{article.status}</p><div className="article-side-line" /><span className="eyebrow">TAGS</span><p className="article-tag-links">{article.tags.join(" · ") || "No tags yet"}</p></aside>
        <ArticleBody body={article.body || "Your story body will appear here as you write."} endLabel="END OF PREVIEW" />
      </div>
    </main>
  );
}
