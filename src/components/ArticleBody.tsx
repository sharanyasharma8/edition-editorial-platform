import { parseEditorialBody } from "@/lib/editorial-body";

export function ArticleBody({ body, endLabel = "END OF STORY" }: { body: string; endLabel?: string }) {
  let dropcapUsed = false;
  const blocks = parseEditorialBody(body);

  if (!blocks.length) {
    return <div className="article-body"><p className="article-dropcap">This story is being prepared by the editorial desk.</p></div>;
  }

  return (
    <article className="article-body">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return <h2 className="article-section-heading" key={`heading-${index}`}>{block.text}</h2>;
        }
        if (block.type === "quote") {
          return (
            <blockquote className="article-pullquote" key={`quote-${index}`}>
              <p>{block.text}</p>
              {block.attribution ? <cite>{block.attribution}</cite> : null}
            </blockquote>
          );
        }
        const isLead = !dropcapUsed;
        dropcapUsed = true;
        return <p className={isLead ? "article-dropcap" : undefined} key={`paragraph-${index}`}>{block.text}</p>;
      })}
      <div className="article-endnote"><span>—</span><p>{endLabel}</p><span>—</span></div>
    </article>
  );
}
