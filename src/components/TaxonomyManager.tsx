"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Check, Pencil } from "lucide-react";
import type { Article, BrandSlug } from "@/lib/types";

type TermProps = { kind: "category" | "tag"; name: string; count: number; brand?: BrandSlug; canManage: boolean; onSaved: (message: string) => void };

function TaxonomyTerm({ kind, name, count, brand, canManage, onSaved }: TermProps) {
  const router = useRouter();
  const [nextName, setNextName] = useState(name);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || !editing) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/cms/taxonomy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, from: name, to: nextName, ...(brand ? { brand } : {}) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not rename this term.");
      onSaved(payload.message);
      setMessage("");
      setEditing(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not rename this term.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="taxonomy-manage-row" onSubmit={submit}>
      <div className="taxonomy-term-meta"><strong>{name}</strong>{brand ? <small>{brand === "edit" ? "THE EDIT" : "FORM"}</small> : null}</div>
      {editing ? <input aria-label={`New name for ${name}`} value={nextName} onChange={(event) => setNextName(event.target.value)} maxLength={60} /> : <small className="taxonomy-count">{count} {count === 1 ? "STORY" : "STORIES"}</small>}
      {canManage && (editing
        ? <div className="taxonomy-actions"><button className="text-action" type="submit" disabled={busy || nextName.trim().length < 2}>{busy ? "SAVING…" : "SAVE"}</button><button className="text-action" type="button" onClick={() => { setEditing(false); setNextName(name); setMessage(""); }}>CANCEL</button></div>
        : <button className="taxonomy-edit" type="button" aria-label={`Rename ${name}`} onClick={() => { setEditing(true); setMessage(""); }}><Pencil size={13} /></button>)}
      {message && <span className="taxonomy-message" role="status"><Check size={12} /> {message}</span>}
    </form>
  );
}

export function TaxonomyManager({ articles, canManage }: { articles: Article[]; canManage: boolean }) {
  const [announcement, setAnnouncement] = useState("");
  const categoryByKey = new Map<string, { name: string; brand: BrandSlug; count: number }>();
  for (const article of articles) {
    const key = `${article.brand}:${article.category.toLocaleLowerCase()}`;
    const existing = categoryByKey.get(key);
    if (existing) existing.count += 1;
    else categoryByKey.set(key, { name: article.category, brand: article.brand, count: 1 });
  }
  const categories = [...categoryByKey.values()].sort(
    (a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name),
  );
  const tagCounts = new Map<string, { name: string; count: number }>();
  for (const article of articles) {
    const articleTags = new Set(article.tags.map((tag) => tag.trim()).filter(Boolean));
    for (const name of articleTags) {
      const key = name.toLocaleLowerCase();
      const existing = tagCounts.get(key);
      if (existing) existing.count += 1;
      else tagCounts.set(key, { name, count: 1 });
    }
  }
  const tags = [...tagCounts.values()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="metadata-page">
      <Link href="/studio" className="back-link">← BACK TO STUDIO</Link>
      <span className="eyebrow">EDITORIAL DIRECTORY / TAXONOMY</span>
      <h1>Language that<br /><em>connects stories.</em></h1>
      <p className="design-intro">Sections are managed per publication to preserve each journal’s vocabulary. Tags are shared discovery terms; a tag rename updates every story that uses it.</p>
      {canManage ? <p className="taxonomy-guidance"><ArrowRight size={14} /> Rename a section or tag to update the stories using it. This action changes editorial metadata, not the story body.</p> : <p className="editor-guidance">Taxonomy is read-only for author accounts. Ask an editor to rename a section or shared tag.</p>}
      <p className="taxonomy-message" role="status" aria-live="polite">{announcement}</p>
      <div className="taxonomy-columns"><section><span className="eyebrow">SECTIONS ({categories.length})</span>{categories.map((category) => <TaxonomyTerm key={`${category.brand}:${category.name}`} kind="category" name={category.name} brand={category.brand} count={category.count} canManage={canManage} onSaved={setAnnouncement} />)}</section><section><span className="eyebrow">SHARED TAGS ({tags.length})</span>{tags.map((tag) => <TaxonomyTerm key={tag.name.toLocaleLowerCase()} kind="tag" name={tag.name} count={tag.count} canManage={canManage} onSaved={setAnnouncement} />)}</section></div>
    </main>
  );
}
