"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Save, CalendarClock, Eye } from "lucide-react";
import Link from "next/link";
import type { Article, BrandSlug, ArticleStatus, GalleryImage } from "@/lib/types";
import { ArticlePreview } from "@/components/ArticlePreview";
import { isAllowedEditorialImageUrl } from "@/lib/image-url";
import { AIWorkbench } from "@/components/AIWorkbench";
export function ArticleEditor({ initialArticle, canPublish = false }: { initialArticle?: Article; canPublish?: boolean }) {
  const router = useRouter();
  const [brand, setBrand] = useState<BrandSlug>(initialArticle?.brand ?? "edit");
  const [title, setTitle] = useState(initialArticle?.title ?? "");
  const [dek, setDek] = useState(initialArticle?.dek ?? "");
  const [category, setCategory] = useState(initialArticle?.category ?? "Fashion");
  const [heroImage, setHeroImage] = useState(initialArticle?.heroImage ?? "");
  const [heroAlt, setHeroAlt] = useState(initialArticle?.heroAlt ?? "");
  const [imageCredit, setImageCredit] = useState(initialArticle?.imageCredit ?? "");
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>(initialArticle?.galleryImages ?? []);
  const [body, setBody] = useState(initialArticle?.body ?? "");
  const [tags, setTags] = useState(initialArticle?.tags.join(", ") ?? "");
  const [scheduleAt, setScheduleAt] = useState(initialArticle?.scheduledAt?.slice(0, 16) ?? "");
  const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [busy, setBusy] = useState(false); const [showAI, setShowAI] = useState(false); const [showPreview, setShowPreview] = useState(false);
  async function save(status: ArticleStatus) {
    if (initialArticle?.status === "PUBLISHED" && status !== "PUBLISHED" && !window.confirm("This story is currently live. Saving it in another status will remove it from the public publication. Continue?")) return;
    setBusy(true); setError(""); setSuccess("");
    const missingField = title.trim().length < 5 ? "Add a headline of at least five characters."
      : dek.trim().length < 12 ? "Add a stand-first of at least twelve characters."
      : category.trim().length < 2 ? "Add an editorial section."
      : body.trim().length < 80 ? "Add at least 80 characters of story copy."
      : !heroImage.trim() ? "Select an image from the Media Library or provide an approved HTTPS image URL."
      : heroAlt.trim().length < 8 ? "Add meaningful image alt text (at least eight characters)."
      : imageCredit.trim().length < 3 ? "Add the photographer, agency or rights-holder credit."
      : tags.split(",").map((tag) => tag.trim()).filter(Boolean).length > 12 ? "Use no more than twelve tags."
      : galleryImages.length > 12 ? "Use no more than twelve gallery images."
      : galleryImages.some((image) => !image.src.trim() || !isAllowedEditorialImageUrl(image.src) || image.alt.trim().length < 8 || image.credit.trim().length < 3) ? "Complete every gallery image URL, meaningful alt text and image credit."
      : !isAllowedEditorialImageUrl(heroImage) ? "Use a Media Library upload or an approved HTTPS image host."
      : "";
    if (missingField) { setError(missingField); setBusy(false); return; }
    if (status === "SCHEDULED" && (!scheduleAt || Number.isNaN(new Date(scheduleAt).getTime()))) { setError("Choose a valid publication date and time before scheduling."); setBusy(false); return; }
    try {
      const payload = { brand, title, dek, category, body, tags: tags.split(",").map((t) => t.trim()).filter(Boolean), heroImage, heroAlt, imageCredit, galleryImages, status, ...(status === "SCHEDULED" ? { scheduledAt: new Date(scheduleAt).toISOString() } : {}) };
      const url = initialArticle ? `/api/cms/articles/${initialArticle.id}` : "/api/cms/articles";
      const response = await fetch(url, { method: initialArticle ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to save story.");
      setSuccess("Saved. The story remains unpublished until an editor approves it."); router.push("/studio"); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save story."); } finally { setBusy(false); }
  }
  function updateGalleryImage(index: number, patch: Partial<GalleryImage>) {
    setGalleryImages((current) => current.map((image, imageIndex) => imageIndex === index ? { ...image, ...patch } : image));
  }
  const previewArticle: Article = {
    id: initialArticle?.id ?? "draft-preview",
    slug: initialArticle?.slug ?? (title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "untitled-story"),
    brand, title: title || "Untitled story", dek, category, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    heroImage: heroImage || initialArticle?.heroImage || "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1800&q=80",
    heroAlt: heroAlt || "Editorial image awaiting a human alt-text review",
    imageCredit: imageCredit || "Image credit required before publication",
    author: initialArticle?.author ?? { name: "Your byline", slug: "draft-preview", role: "Contributor", bio: "", avatar: "" },
    galleryImages,
    publishedAt: initialArticle?.publishedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(), readMinutes: Math.max(1, Math.ceil(body.length / 950)),
    featured: initialArticle?.featured ?? false, status: initialArticle?.status ?? "DRAFT", body,
  };
  return <div className="editor-workspace"><div className="studio-page-head"><div><Link href="/studio" className="back-link"><ArrowLeft size={14} /> BACK TO STORIES</Link><span className="eyebrow">EDITORIAL WORKSPACE / {initialArticle ? "EDIT STORY" : "NEW STORY"}</span><h1>{initialArticle ? "Edit story" : "New story"}<span>.</span></h1></div><div className="editor-actions"><button className="button-outline" type="button" onClick={() => setShowPreview((open) => !open)} aria-expanded={showPreview}><Eye size={15} /> {showPreview ? "HIDE PREVIEW" : "PREVIEW STORY"}</button><button className="button-outline" type="button" onClick={() => setShowAI(!showAI)} aria-expanded={showAI}><Sparkles size={15} /> {showAI ? "HIDE ASSISTANT" : "AI ASSISTANT"}</button><button className="button-dark" type="button" disabled={busy} onClick={() => save("DRAFT")}><Save size={15} /> SAVE DRAFT</button></div></div>
    {showPreview && <section className={`studio-preview-frame publication-shell theme-${brand}`} aria-label="Live unpublished story preview"><div className="private-preview-banner"><span>LIVE DRAFT PREVIEW · PRIVATE</span><button type="button" onClick={() => setShowPreview(false)}>CLOSE PREVIEW ×</button></div><ArticlePreview article={previewArticle} /></section>}
    <div className="editor-grid"><section className="editor-main"><label>PUBLICATION<select value={brand} disabled={Boolean(initialArticle)} onChange={(e) => { const next = e.target.value as BrandSlug; setBrand(next); setCategory(next === "edit" ? "Fashion" : "Architecture"); }}><option value="edit">THE EDIT</option><option value="form">FORM</option></select></label><label>HEADLINE<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Write a considered headline…" maxLength={140} /></label><div className="field-foot"><span>HEADLINE</span><span>{title.length}/140</span></div><label>DECK / STAND-FIRST<textarea rows={3} value={dek} onChange={(e) => setDek(e.target.value)} placeholder="Give readers a reason to stay…" maxLength={280} /></label><label>SECTION<input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Fashion, Architecture, Culture…" /></label><label>IMAGE URL<input value={heroImage} onChange={(e) => setHeroImage(e.target.value)} placeholder="Paste a copied Media Library URL or approved HTTPS image URL…" /></label><p className="editor-guidance">Choose an image from the Media Library and copy its URL. A story cannot be saved without an explicit asset and its own alt text and credit.</p><label>IMAGE ALT TEXT<input value={heroAlt} onChange={(e) => setHeroAlt(e.target.value)} placeholder="Describe what is visible, not what you assume…" /></label><label>IMAGE CREDIT<input value={imageCredit} onChange={(e) => setImageCredit(e.target.value)} placeholder="Photographer, studio or supplied source" maxLength={160} /></label><section className="gallery-editor" aria-labelledby="gallery-editor-title"><div className="gallery-editor-heading"><div><span className="eyebrow">OPTIONAL / UP TO 12 IMAGES</span><h3 id="gallery-editor-title">Story gallery</h3></div><button className="button-outline" type="button" onClick={() => setGalleryImages((current) => [...current, { src: "", alt: "", credit: "" }])} disabled={galleryImages.length >= 12}>ADD IMAGE +</button></div>{galleryImages.map((image, index) => <fieldset className="gallery-editor-item" key={index}><legend>IMAGE {String(index + 1).padStart(2, "0")}</legend><label>IMAGE URL<input value={image.src} onChange={(e) => updateGalleryImage(index, { src: e.target.value })} placeholder="Paste a copied Media Library URL" /></label><label>IMAGE ALT TEXT<input value={image.alt} onChange={(e) => updateGalleryImage(index, { alt: e.target.value })} placeholder="Describe the visible image" /></label><label>IMAGE CREDIT<input value={image.credit} onChange={(e) => updateGalleryImage(index, { credit: e.target.value })} placeholder="Photographer or rights holder" /></label><button className="text-action" type="button" onClick={() => setGalleryImages((current) => current.filter((_, imageIndex) => imageIndex !== index))}>REMOVE IMAGE</button></fieldset>)}{galleryImages.length === 0 && <p className="editor-guidance">Add supporting images to create an interactive gallery below the story’s lead image.</p>}</section><label>TAGS<input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Craft, Culture, Perspective" /></label><label>STORY BODY<textarea className="body-editor" rows={18} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Begin with the detail that makes this story necessary. Separate paragraphs with a blank line. Use ## for a section heading and > for an attributed pull quote…" /></label><div className="editor-guidance">A useful first draft is specific, attributed and complete. Suggested copy remains a draft until a human editor reviews it.</div>{error && <p className="form-error" role="alert">{error}</p>}{success && <p className="form-success">{success}</p>}<div className="editor-bottom-actions"><button className="button-outline" disabled={busy} onClick={() => save("DRAFT")}>SAVE AS DRAFT</button><button className="button-outline" disabled={busy} onClick={() => save("REVIEW")}>SEND FOR REVIEW</button>{canPublish && <><div className="schedule-control"><label htmlFor="schedule-at">SCHEDULE PUBLICATION</label><input id="schedule-at" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} /></div><button className="button-dark" disabled={busy} onClick={() => save("SCHEDULED")}><CalendarClock size={15} /> SCHEDULE</button></>}</div>{initialArticle && <Link href={`/studio/stories/${initialArticle.id}/versions`} className="text-link">VIEW VERSION HISTORY ↗</Link>}</section><aside className="editor-aside"><div className="aside-card"><span className="eyebrow">STORY STATUS</span><h3>{initialArticle?.status ?? "In progress"}</h3><p>Your story remains private until an editor approves and publishes it. Scheduled stories require the configured publisher job.</p><div className="status-line"><span className="status-dot" /> {initialArticle?.status ?? "DRAFT"} · EDITORIAL CONTROL</div></div><div className="aside-card"><span className="eyebrow">EDITORIAL CHECKLIST</span><ul><li>Headline is clear and distinctive</li><li>Deck adds context, not repetition</li><li>Image has verified credit and alt text</li><li>Names, dates and claims are checked</li><li>Sources and permissions are recorded</li></ul></div>{showAI && <AIWorkbench title={title} dek={dek} body={body} brand={brand} onApply={(suggestion) => { setDek(suggestion); setShowAI(false); }} onApplyAltText={(suggestion) => setHeroAlt(suggestion)} onApplyTags={(suggestions) => setTags(Array.from(new Set([...tags.split(",").map((tag) => tag.trim()).filter(Boolean), ...suggestions])).join(", "))} />}</aside></div></div>;
}
