export type EditorialBodyBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "quote"; text: string; attribution?: string };

/**
 * Parse a deliberately small editorial text format without rendering arbitrary HTML.
 * Blank lines separate blocks; `## ` creates a subhead; `> ` creates a pull quote.
 * An em dash at the end of a quote may introduce an attribution.
 */
export function parseEditorialBody(source: string): EditorialBodyBlock[] {
  return source
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block): EditorialBodyBlock => {
      if (block.startsWith("## ")) {
        return { type: "heading", text: block.slice(3).trim() };
      }

      if (block.split("\n").every((line) => line.trimStart().startsWith(">"))) {
        const quote = block
          .split("\n")
          .map((line) => line.trim().replace(/^>\s?/, ""))
          .join(" ")
          .trim();
        const attributionMatch = quote.match(/\s+[—–]\s+([^—–]+)$/);
        if (attributionMatch) {
          return {
            type: "quote",
            text: quote.slice(0, attributionMatch.index).trim(),
            attribution: attributionMatch[1].trim(),
          };
        }
        return { type: "quote", text: quote };
      }

      return { type: "paragraph", text: block.replace(/\n+/g, " ").trim() };
    })
    .filter((block) => block.text.length > 0);
}
