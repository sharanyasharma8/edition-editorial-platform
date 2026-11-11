import Link from "next/link";
import type { BrandSlug } from "@/lib/types";
import { PUBLICATIONS } from "@/lib/brands";
export function SiteFooter({ brand }: { brand: BrandSlug }) {
  const other = brand === "edit" ? "form" : "edit";
  return <footer className={`site-footer footer-${brand}`}>
    <div className="footer-top"><div><span className="eyebrow">A SHARED POINT OF VIEW</span><p>Stories worth<br /><em>staying with.</em></p></div><div className="footer-brand-switch"><span>DISCOVER OUR OTHER JOURNAL</span><Link href={`/${other}`}>{PUBLICATIONS[other].name} <span>↗</span></Link></div></div>
    <div className="footer-bottom"><Link href={`/${brand}`} className="footer-wordmark">{PUBLICATIONS[brand].name}</Link><span>© 2026 EDITION JOURNALS</span><div><Link href="/studio">EDITORIAL STUDIO</Link><a href="mailto:hello@edition.studio">CONTACT</a><a href="#top">BACK TO TOP ↑</a></div></div>
  </footer>;
}
