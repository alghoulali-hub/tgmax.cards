"use client";

import { useEffect, useMemo, useState } from "react";
import Cropper, { Area } from "react-easy-crop";

export function SmartScanCropper({ file, onCancel, onComplete }: { file: File; onCancel: () => void; onComplete: (file: File) => void }) {
  const source = useMemo(() => URL.createObjectURL(file), [file]);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState(5 / 7);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [brightness, setBrightness] = useState(8);
  const [contrast, setContrast] = useState(14);
  const [saving, setSaving] = useState(false);
  useEffect(() => () => URL.revokeObjectURL(source), [source]);

  async function applyCrop() {
    if (!pixels) return;
    setSaving(true);
    try {
      onComplete(await cropScannedCard(source, pixels, file.name, rotation, brightness, contrast));
    } finally {
      setSaving(false);
    }
  }

  return <div className="scan-editor" role="dialog" aria-modal="true" aria-label="Crop scanned card">
    <section>
      <header><div><span className="kicker">Smart scan</span><h2>Crop the card</h2></div><button type="button" onClick={onCancel} aria-label="Close scanner">×</button></header>
      <div className="scan-crop-area"><Cropper image={source} crop={crop} zoom={zoom} rotation={rotation} aspect={aspect} showGrid objectFit="contain" onCropChange={setCrop} onZoomChange={setZoom} onRotationChange={setRotation} onCropComplete={(_, areaPixels) => setPixels(areaPixels)} /></div>
      <div className="scan-controls">
        <label>Zoom<input type="range" min={1} max={3} step={.01} value={zoom} onChange={event => setZoom(Number(event.target.value))} /></label>
        <label>Rotate<input type="range" min={-180} max={180} step={1} value={rotation} onChange={event => setRotation(Number(event.target.value))} /><output>{rotation}°</output></label>
        <label>Crop shape<input type="range" min={.5} max={2} step={.01} value={aspect} onChange={event => setAspect(Number(event.target.value))} /><output>{aspect.toFixed(2)}</output></label>
        <label>Brightness<input type="range" min={-50} max={50} step={1} value={brightness} onChange={event => setBrightness(Number(event.target.value))} /><output>{brightness > 0 ? "+" : ""}{brightness}</output></label>
        <label>Contrast<input type="range" min={-50} max={50} step={1} value={contrast} onChange={event => setContrast(Number(event.target.value))} /><output>{contrast > 0 ? "+" : ""}{contrast}</output></label>
      </div>
      <div className="scan-presets"><button type="button" onClick={() => setAspect(5 / 7)}>Card 5:7</button><button type="button" onClick={() => setAspect(1)}>Square</button><button type="button" onClick={() => setAspect(7 / 5)}>Landscape</button><button type="button" onClick={() => setRotation(value => value - 90)}>↶ 90°</button><button type="button" onClick={() => setRotation(value => value + 90)}>↷ 90°</button><button type="button" onClick={() => { setBrightness(0); setContrast(0); }}>Reset light</button></div>
      <p>Drag the photo until only the card is inside the gold guide, then apply the crop.</p>
      <footer><button type="button" className="scan-cancel" onClick={onCancel}>Cancel</button><button type="button" className="scan-apply" disabled={!pixels || saving} onClick={() => void applyCrop()}>{saving ? "Processing…" : "Apply crop & enhancement →"}</button></footer>
    </section>
  </div>;
}

async function cropScannedCard(source: string, crop: Area, originalName: string, rotation: number, brightness: number, contrast: number) {
  const image = await loadImage(source);
  const rotated = rotateImage(image, rotation);
  const scale = Math.min(1, 1600 / Math.max(crop.width, crop.height));
  const outputWidth = Math.max(1, Math.round(crop.width * scale));
  const outputHeight = Math.max(1, Math.round(crop.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(rotated, crop.x, crop.y, crop.width, crop.height, 0, 0, outputWidth, outputHeight);
  applyLightAdjustments(context, outputWidth, outputHeight, brightness, contrast);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", .92));
  if (!blob) throw new Error("Unable to process scan");
  return new File([blob], `${originalName.replace(/\.[^.]+$/, "")}-cropped.jpg`, { type: "image/jpeg" });
}

function rotateImage(image: HTMLImageElement, rotation: number) {
  const radians = rotation * Math.PI / 180;
  const width = Math.abs(Math.cos(radians) * image.naturalWidth) + Math.abs(Math.sin(radians) * image.naturalHeight);
  const height = Math.abs(Math.sin(radians) * image.naturalWidth) + Math.abs(Math.cos(radians) * image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width); canvas.height = Math.ceil(height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(radians);
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  return canvas;
}

function applyLightAdjustments(context: CanvasRenderingContext2D, width: number, height: number, brightness: number, contrast: number) {
  if (!brightness && !contrast) return;
  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;
  const brightnessShift = brightness * 2.55;
  const contrastValue = contrast * 2.55;
  const factor = (259 * (contrastValue + 255)) / (255 * (259 - contrastValue));
  for (let index = 0; index < data.length; index += 4) {
    data[index] = clamp(factor * (data[index] - 128) + 128 + brightnessShift);
    data[index + 1] = clamp(factor * (data[index + 1] - 128) + 128 + brightnessShift);
    data[index + 2] = clamp(factor * (data[index + 2] - 128) + 128 + brightnessShift);
  }
  context.putImageData(imageData, 0, 0);
}

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}
