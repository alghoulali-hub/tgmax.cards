"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function ZoomableImage({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  return <>
    <button type="button" className={`zoom-image ${className}`} onClick={event => { event.stopPropagation(); setOpen(true); }} aria-label={`Zoom ${alt}`}>
      <img src={src} alt={alt} /><span>⌕</span>
    </button>
    {mounted && open && createPortal(<div className="image-lightbox" role="dialog" aria-modal="true" aria-label={alt} onClick={() => setOpen(false)}>
      <button type="button" aria-label="Close image">×</button>
      <img src={src} alt={alt} onClick={event => event.stopPropagation()} />
    </div>, document.body)}
  </>;
}
