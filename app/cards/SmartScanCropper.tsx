"use client";

import { useEffect, useMemo, useState } from "react";
import Cropper, { Area } from "react-easy-crop";

export function SmartScanCropper({ file, onCancel, onComplete }: { file: File; onCancel: () => void; onComplete: (file: File) => void }) {
  const source = useMemo(() => URL.createObjectURL(file), [file]);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [enhance, setEnhance] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => () => URL.revokeObjectURL(source), [source]);

  async function applyCrop() {
    if (!pixels) return;
    setSaving(true);
    try {
      onComplete(await cropScannedCard(source, pixels, file.name, enhance));
    } finally {
      setSaving(false);
    }
  }

  return <div className="scan-editor" role="dialog" aria-modal="true" aria-label="Crop scanned card">
    <section>
      <header><div><span className="kicker">Smart scan</span><h2>Crop the card</h2></div><button type="button" onClick={onCancel} aria-label="Close scanner">×</button></header>
      <div className="scan-crop-area"><Cropper image={source} crop={crop} zoom={zoom} aspect={5 / 7} showGrid objectFit="contain" onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, areaPixels) => setPixels(areaPixels)} /></div>
      <div className="scan-controls">
        <label>Zoom<input type="range" min={1} max={3} step={.01} value={zoom} onChange={event => setZoom(Number(event.target.value))} /></label>
        <label className="enhance-toggle"><input type="checkbox" checked={enhance} onChange={event => setEnhance(event.target.checked)} /><span>Enhance contrast, brightness, and color</span></label>
      </div>
      <p>Drag the photo until only the card is inside the gold guide, then apply the crop.</p>
      <footer><button type="button" className="scan-cancel" onClick={onCancel}>Cancel</button><button type="button" className="scan-apply" disabled={!pixels || saving} onClick={() => void applyCrop()}>{saving ? "Processing…" : "Apply crop & enhancement →"}</button></footer>
    </section>
  </div>;
}

async function cropScannedCard(source: string, crop: Area, originalName: string, enhance: boolean) {
  const image = await loadImage(source);
  const outputWidth = 1000;
  const outputHeight = 1400;
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.filter = enhance ? "contrast(1.14) saturate(1.1) brightness(1.04)" : "none";
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, outputWidth, outputHeight);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", .92));
  if (!blob) throw new Error("Unable to process scan");
  return new File([blob], `${originalName.replace(/\.[^.]+$/, "")}-cropped.jpg`, { type: "image/jpeg" });
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}
