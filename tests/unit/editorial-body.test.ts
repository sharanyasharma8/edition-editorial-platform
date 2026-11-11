import { describe, expect, it } from "vitest";
import { parseEditorialBody } from "@/lib/editorial-body";

describe("editorial body blocks", () => {
  it("keeps prose as paragraphs and recognises section subheads", () => {
    expect(parseEditorialBody("An opening paragraph.\n\n## The material question\n\nA second paragraph." )).toEqual([
      { type: "paragraph", text: "An opening paragraph." },
      { type: "heading", text: "The material question" },
      { type: "paragraph", text: "A second paragraph." },
    ]);
  });

  it("renders quoted blocks as text with an optional attribution", () => {
    expect(parseEditorialBody("> The room should make space for living. — Mara Ellison")).toEqual([
      { type: "quote", text: "The room should make space for living.", attribution: "Mara Ellison" },
    ]);
  });

  it("does not interpret inline HTML as markup", () => {
    expect(parseEditorialBody("A paragraph with <script>alert(1)</script> as literal editorial text.")).toEqual([
      { type: "paragraph", text: "A paragraph with <script>alert(1)</script> as literal editorial text." },
    ]);
  });
});
