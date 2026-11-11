"use client";
import Link from "next/link";
import { useState } from "react";
import { Search, Menu, X, ArrowUpRight } from "lucide-react";
import type { BrandSlug } from "@/lib/types";
import { PUBLICATIONS } from "@/lib/brands";

export function SiteHeader({ brand }: { brand: BrandSlug }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const publication = PUBLICATIONS[brand];
  const other = brand === "edit" ? "form" : "edit";
  const nav = publication.categories;
  return (
    <header className={`site-header header-${brand}`}>
      <div className="topline"><span>INDEPENDENT PERSPECTIVES. ALWAYS IN PROGRESS.</span><span>ISSUE NO. 04&nbsp;&nbsp; / &nbsp;&nbsp;NOVEMBER 2026</span></div>
      <div className="masthead-row">
        <button className="icon-button menu-trigger" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
        <Link href={`/${brand}`} className={`wordmark wordmark-${brand}`} aria-label={`${publication.name} home`}>{brand === "edit" ? <>THE <i>EDIT</i></> : <>FORM<span className="wordmark-dot">.</span></>}</Link>
        <div className="masthead-tools"><Link className="publication-switch" href={`/${other}`}><span>EXPLORE</span><strong>{PUBLICATIONS[other].name}</strong><ArrowUpRight size={13} /></Link><Link href={`/${brand}/search`} className="icon-button search-trigger" aria-label="Search"><Search size={18} /></Link></div>
      </div>
      <nav className={`primary-nav ${menuOpen ? "is-open" : ""}`} aria-label={`${publication.name} sections`}>
        {nav.map((item) => <Link href={`/${brand}/category/${encodeURIComponent(item.toLowerCase())}`} key={item} onClick={() => setMenuOpen(false)}>{item}</Link>)}
        <Link href="/studio" className="studio-nav-link" onClick={() => setMenuOpen(false)}>STUDIO <ArrowUpRight size={12} /></Link>
      </nav>
      {menuOpen && <button className="menu-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    </header>
  );
}
