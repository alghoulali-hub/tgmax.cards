"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactCrop, { centerCrop, makeAspectCrop, PixelCrop, type Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

export function SmartScanCropper({ file, onCancel, onComplete }: { file: File; onCancel: () => void; onComplete: (file: File) => void }) {
  const [workingFile, setWorkingFile] = useState(file);
  const source = useMemo(() => URL.createObjectURL(workingFile), [workingFile]);
  const imageRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>({ unit: "%", x: 10, y: 5, width: 80, height: 90 });
  const [pixels, setPixels] = useState<PixelCrop | null>(null);
  const [brightness, setBrightness] = useState(8);
  const [contrast, setContrast] = useState(14);
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);
  useEffect(() => () => URL.revokeObjectURL(source), [source]);

  function applyPreset(aspect?: number) {
    const image = imageRef.current;
    if (!image) return;
    if (!aspect) {
      setCrop({ unit: "%", x: 10, y: 10, width: 80, height: 80 });
      return;
    }
    setCrop(centerCrop(makeAspectCrop({ unit: "%", width: 82 }, aspect, image.width, image.height), image.width, image.height));
  }

  async function rotate(direction: -90 | 90) {
    setRotating(true);
    try {
      setWorkingFile(await rotateFile(workingFile, direction));
      setPixels(null);
    } finally {
      setRotating(false);
    }
  }

  async function applyCrop() {
    if (!pixels || !imageRef.current) return;
    setSaving(true);
    try {
      onComplete(await cropScannedCard(imageRef.current, pixels, workingFile.name, brightness, contrast));
    } finally {
      setSaving(false);
    }
  }

  return <div className="scan-editor" role="dialog" aria-modal="true" aria-label="Crop scanned card">
    <section>
      <header><div><span className="kicker">Smart scan</span><h2>Drag the edges to crop</h2></div><button type="button" onClick={onCancel} aria-label="Close scanner">×</button></header>
      <div className="scan-crop-area free-crop">
        <ReactCrop crop={crop} onChange={next => setCrop(next)} onComplete={next => setPixels(next)} minWidth={40} minHeight={40} keepSelection>
          <img ref={imageRef} src={source} alt="Scanned card to crop" onLoad={() => applyPreset(5 / 7)} />
        </ReactCrop>
      </div>
      <div className="scan-presets">
        <button type="button" onClick={() => applyPreset(undefined)}>Free crop</button>
        <button type="button" onClick={() => applyPreset(5 / 7)}>Card 5:7</button>
        <button type="button" onClick={() => applyPreset(1)}>Square</button>
        <button type="button" onClick={() => applyPreset(7 / 5)}>Landscape</button>
        <button type="button" disabled={rotating} onClick={() => void rotate(-90)}>↶ Rotate</button>
        <button type="button" disabled={rotating} onClick={() => void rotate(90)}>↷ Rotate</button>
      </div>
      <div className="scan-controls">
        <label>Brightness<input type="range" min={-50} max={50} step={1} value={brightness} onChange={event => setBrightness(Number(event.target.value))} /><output>{brightness > 0 ? "+" : ""}{brightness}</output></label>
        <label>Contrast<input type="range" min={-50} max={50} step={1} value={contrast} onChange={event => setContrast(Number(event.target.value))} /><output>{contrast > 0 ? "+" : ""}{contrast}</output></label>
      </div>
      <p>Drag any gold corner or edge to resize the crop. Drag inside the box to reposition it.</p>
      <footer><button type="button" className="scan-cancel" onClick={onCancel}>Cancel</button><button type="button" className="scan-apply" disabled={!pixels || saving || rotating} onClick={() => void applyCrop()}>{saving ? "Processing…" : "Apply crop & enhancement →"}</button></footer>
    </section>
  </div>;
}

async function cropScannedCard(image: HTMLImageElement, crop: PixelCrop, originalName: string, brightness: number, contrast: number) {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const sourceWidth = Math.max(1, crop.width * scaleX);
  const sourceHeight = Math.max(1, crop.height * scaleY);
  const outputScale = Math.min(1, 1800 / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * outputScale));
  canvas.height = Math.max(1, Math.round(sourceHeight * outputScale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, crop.x * scaleX, crop.y * scaleY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
  applyLightAdjustments(context, canvas.width, canvas.height, brightness, contrast);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", .92));
  if (!blob) throw new Error("Unable to process scan");
  return new File([blob], `${originalName.replace(/\.[^.]+$/, "")}-cropped.jpg`, { type: "image/jpeg" });
}

async function rotateFile(file: File, degrees: -90 | 90) {
  const objectUrl = URL.createObjectURL(file);
  const image = await loadImage(objectUrl);
  URL.revokeObjectURL(objectUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalHeight;
  canvas.height = image.naturalWidth;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(degrees * Math.PI / 180);
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", .94));
  if (!blob) throw new Error("Unable to rotate scan");
  return new File([blob], file.name.replace(/\.[^.]+$/, "-rotated.jpg"), { type: "image/jpeg" });
}

function applyLightAdjustments(context: CanvasRenderingContext2D, width: number, height: number, brightness: number, contrast: number) {
  if (!brightness && !contrast) return;
  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;
  const shift = brightness * 2.55;
  const value = contrast * 2.55;
  const factor = (259 * (value + 255)) / (255 * (259 - value));
  for (let index = 0; index < data.length; index += 4) {
    data[index] = clamp(factor * (data[index] - 128) + 128 + shift);
    data[index + 1] = clamp(factor * (data[index + 1] - 128) + 128 + shift);
    data[index + 2] = clamp(factor * (data[index + 2] - 128) + 128 + shift);
  }
  context.putImageData(imageData, 0, 0);
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
