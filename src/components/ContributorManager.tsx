"use client";

import Link from "next/link";
import { useState } from "react";
import { Save, UserRound } from "lucide-react";
import type { Author } from "@/lib/types";

export function ContributorManager({ initialContributors, canManage }: { initialContributors: Author[]; canManage: boolean }) {
  const [drafts, setDrafts] = useState<Record<string, Author>>(() => Object.fromEntries(initialContributors.map((author) => [author.slug, { ...author }])));
  const [saving, setSaving] = useState("");
  const [messages, setMessages] = useState<Record<string, string>>({});
  const update = (slug: string, patch: Partial<Author>) => setDrafts((current) => ({ ...current, [slug]: { ...current[slug], ...patch } }));

  async function save(slug: string) {
    setSaving(slug);
    setMessages((current) => ({ ...current, [slug]: "" }));
    try {
      const response = await fetch(`/api/cms/contributors/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(drafts[slug]),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save contributor.");
      setMessages((current) => ({ ...current, [slug]: "PROFILE SAVED" }));
    } catch (error) {
      setMessages((current) => ({ ...current, [slug]: error instanceof Error ? error.message : "Could not save contributor." }));
    } finally {
      setSaving("");
    }
  }

  return (
    <main className="metadata-page">
      <Link href="/studio" className="back-link">← BACK TO STUDIO</Link>
      <span className="eyebrow">EDITORIAL DIRECTORY / PEOPLE</span>
      <h1>The people<br /><em>behind the page.</em></h1>
      <p className="design-intro">Contributor profiles power editorial bylines and author pages across both journals. Editors can maintain the name, role, biography and approved portrait used throughout EDITION.</p>
      <div className="metadata-list contributor-list">
        {initialContributors.map((author) => {
          const draft = drafts[author.slug];
          return (
            <form className="contributor-card" key={author.slug} onSubmit={(event) => { event.preventDefault(); void save(author.slug); }}>
              <div className="contributor-card-heading"><span className="contributor-avatar"><UserRound size={20} /></span><div><strong>{author.name}</strong><small>{author.slug}</small></div></div>
              <label>DISPLAY NAME<input value={draft.name} disabled={!canManage || saving === author.slug} onChange={(event) => update(author.slug, { name: event.target.value })} maxLength={80} /></label>
              <label>EDITORIAL ROLE<input value={draft.role} disabled={!canManage || saving === author.slug} onChange={(event) => update(author.slug, { role: event.target.value })} maxLength={80} /></label>
              <label>PORTRAIT URL<input value={draft.avatar} disabled={!canManage || saving === author.slug} onChange={(event) => update(author.slug, { avatar: event.target.value })} maxLength={2048} placeholder="Approved HTTPS portrait URL or local upload" /></label>
              <label>BIOGRAPHY<textarea value={draft.bio} disabled={!canManage || saving === author.slug} onChange={(event) => update(author.slug, { bio: event.target.value })} rows={3} maxLength={1200} /></label>
              <div className="contributor-card-footer"><span className={messages[author.slug] && messages[author.slug] !== "PROFILE SAVED" ? "form-error" : "form-success"} role="status">{messages[author.slug]}</span>{canManage && <button className="button-outline" type="submit" disabled={saving === author.slug}><Save size={14} /> {saving === author.slug ? "SAVING…" : "SAVE PROFILE"}</button>}</div>
            </form>
          );
        })}
      </div>
      {!canManage && <p className="editor-guidance">Contributor profiles are read-only for author accounts. Ask an editor to update these details.</p>}
    </main>
  );
}
