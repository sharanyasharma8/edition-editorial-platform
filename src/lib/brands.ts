import type { BrandSlug, Publication } from "@/lib/types";

export const PUBLICATIONS: Record<BrandSlug, Publication> = {
  edit: {
    slug: "edit",
    name: "THE EDIT",
    descriptor: "Fashion, beauty, culture & the art of living.",
    tagline: "A point of view, beautifully considered.",
    description: "A considered perspective on the people, ideas and objects shaping modern culture.",
    categories: ["Fashion", "Beauty", "Culture", "People", "Living"],
  },
  form: {
    slug: "form",
    name: "FORM",
    descriptor: "Architecture, interiors, art & design.",
    tagline: "Ideas take shape.",
    description: "A study of spaces, objects and the people giving form to what comes next.",
    categories: ["Architecture", "Interiors", "Art", "Objects", "Perspectives"],
  },
};

export function isBrandSlug(value: string): value is BrandSlug {
  return value === "edit" || value === "form";
}

export function getPublication(value: string): Publication | null {
  return isBrandSlug(value) ? PUBLICATIONS[value] : null;
}
