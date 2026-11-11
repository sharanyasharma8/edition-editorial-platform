"use client";
import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
type GalleryImage = { src: string; alt: string; credit: string };
export function StoryGallery({ images }: { images: GalleryImage[] }) {
  const [active, setActive] = useState(0); if (!images.length) return null;
  const current = images[active];
  function move(direction: number) { setActive((index) => (index + direction + images.length) % images.length); }
  return <section className="story-gallery" aria-label="Story image gallery"><div className="gallery-frame"><Image src={current.src} alt={current.alt} fill sizes="(max-width: 760px) 100vw, 75vw" /><div className="gallery-controls"><button onClick={() => move(-1)} aria-label="Previous image"><ChevronLeft size={18} /></button><span>{String(active + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}</span><button onClick={() => move(1)} aria-label="Next image"><ChevronRight size={18} /></button></div></div><div className="gallery-caption"><span>{current.alt}</span><span>{current.credit}</span></div><div className="gallery-thumbnails">{images.map((image, index) => <button key={image.src} className={active === index ? "active" : ""} onClick={() => setActive(index)} aria-label={`Show image ${index + 1}`} aria-pressed={active === index}><Image src={image.src} alt="" width={130} height={86} /></button>)}</div></section>;
}
