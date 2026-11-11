"use client";
import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
export function SaveStoryButton({ slug }: { slug: string }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => { try { setSaved(JSON.parse(localStorage.getItem("edition:saved") || "[]").includes(slug)); } catch { setSaved(false); } }, [slug]);
  function toggle() {
    try { const current: string[] = JSON.parse(localStorage.getItem("edition:saved") || "[]"); const next = saved ? current.filter((item) => item !== slug) : [...current.filter((item) => item !== slug), slug]; localStorage.setItem("edition:saved", JSON.stringify(next)); setSaved(!saved); } catch { /* Private browsing may deny storage. */ }
  }
  return <button type="button" onClick={toggle} className={`save-story ${saved ? "is-saved" : ""}`} aria-pressed={saved}><Bookmark size={15} fill={saved ? "currentColor" : "none"} />{saved ? "SAVED TO READING LIST" : "SAVE THIS STORY"}</button>;
}
