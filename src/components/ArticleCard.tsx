import Image from "next/image";
import Link from "next/link";
import type { Article, BrandSlug } from "@/lib/types";
export function ArticleCard({ article, brand, variant = "standard", index = 0 }: { article: Article; brand: BrandSlug; variant?: "standard" | "feature" | "compact"; index?: number }) {
  return <article className={`article-card card-${variant}`}>
    <Link href={`/${brand}/${article.slug}`} className="card-image-link" aria-label={`Read ${article.title}`}>
      <div className="card-image-wrap"><Image src={article.heroImage} alt={article.heroAlt} fill sizes={variant === "feature" ? "(max-width: 760px) 100vw, 65vw" : "(max-width: 760px) 100vw, 33vw"} priority={index === 0 && variant === "feature"} className="card-image" /></div>
    </Link>
    <div className="card-copy"><div className="card-meta"><span>{article.category}</span><span>{String(article.readMinutes).padStart(2, "0")} MIN READ</span></div>
      <h3><Link href={`/${brand}/${article.slug}`}>{article.title}</Link></h3>
      {variant !== "compact" && <p>{article.dek}</p>}
      <div className="card-byline">BY {article.author.name.toUpperCase()}</div>
    </div>
  </article>;
}
