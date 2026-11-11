import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { isBrandSlug } from "@/lib/brands";
import type { BrandSlug } from "@/lib/types";
export default async function PublicationLayout({ children, params }: { children: React.ReactNode; params: Promise<{ brand: string }> }) {
  const { brand } = await params;
  if (!isBrandSlug(brand)) notFound();
  return <div id="top" className={`publication-shell theme-${brand}`} data-brand={brand}><SiteHeader brand={brand as BrandSlug} />{children}<SiteFooter brand={brand as BrandSlug} /></div>;
}
