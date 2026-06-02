/**
 * Client-side watermark utility using the browser's Canvas API.
 *
 * Watermark style (matches the TOOLSMAN examples):
 *  - Position : horizontally centered, ~60 % down the image
 *  - Scale    : 35 % of the image width (min 120 px)
 *  - Opacity  : 30 %
 *
 * Falls back to elegant gold text "TOOLSMAN" when no watermark image is cached.
 */

import { supabase } from "@/integrations/supabase/client";

// ── cached watermark ──────────────────────────────────────────────────────────
let cachedWatermarkImg: HTMLImageElement | null = null;
let watermarkLoaded = false;

async function getWatermarkImage(): Promise<HTMLImageElement | null> {
  if (watermarkLoaded) return cachedWatermarkImg;

  try {
    const { data } = supabase.storage
      .from("system-assets")
      .getPublicUrl("watermark.png");

    const img = new Image();
    img.crossOrigin = "anonymous";

    await new Promise<void>((resolve) => {
      img.onload  = () => { cachedWatermarkImg = img; resolve(); };
      img.onerror = () => resolve(); // graceful fail
      img.src = data.publicUrl + "?t=" + Date.now();
    });
  } catch {
    cachedWatermarkImg = null;
  }

  watermarkLoaded = true;
  return cachedWatermarkImg;
}

/** Force re-fetch watermark on next call (call after admin uploads new PNG) */
export function resetWatermarkCache() {
  cachedWatermarkImg = null;
  watermarkLoaded = false;
}

// ── canvas compositor ─────────────────────────────────────────────────────────
async function compositeWatermark(
  src: HTMLImageElement,
  wmImg: HTMLImageElement | null,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width  = src.naturalWidth  || src.width;
  canvas.height = src.naturalHeight || src.height;
  const ctx = canvas.getContext("2d")!;

  // Draw source image
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.globalAlpha = 0.30; // 30 % opacity

  if (wmImg) {
    // ── Logo watermark ──────────────────────────────────────────────────────
    const targetW = Math.max(120, Math.floor(canvas.width * 0.35));
    const scale   = targetW / wmImg.naturalWidth;
    const targetH = Math.max(20, Math.floor(wmImg.naturalHeight * scale));

    const x = Math.floor((canvas.width  - targetW) / 2);
    const y = Math.floor( canvas.height * 0.60 - targetH / 2);

    ctx.drawImage(wmImg, x, y, targetW, targetH);
  } else {
    // ── Text fallback — gold/beige "TOOLSMAN" ───────────────────────────────
    const fontSize = Math.min(110, Math.max(22, Math.floor(canvas.width * 0.065)));
    ctx.font         = `${fontSize}px "Cinzel", "Trajan Pro", "Times New Roman", serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign    = "center";
    ctx.letterSpacing = `${Math.floor(fontSize * 0.08)}px`;

    const x = canvas.width  / 2;
    const y = canvas.height * 0.60;

    // Drop shadow
    ctx.globalAlpha   = 0.20;
    ctx.fillStyle     = "#000000";
    ctx.fillText("TOOLSMAN", x + 2, y + 2);

    // Gold text
    ctx.globalAlpha = 0.30;
    ctx.fillStyle   = "#d4c3a3";
    ctx.fillText("TOOLSMAN", x, y);
  }

  ctx.restore();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")),
      "image/jpeg",
      0.88,
    );
  });
}

// ── load any image respecting CORS ───────────────────────────────────────────
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

// ── public API ────────────────────────────────────────────────────────────────

/**
 * Watermark a File (from a file-input or drag-drop) and return:
 *  - the watermarked Blob
 *  - an object-URL for preview (call URL.revokeObjectURL when done)
 */
export async function watermarkFile(
  file: File,
): Promise<{ blob: Blob; objectUrl: string }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const [srcImg, wmImg] = await Promise.all([
      loadImage(objectUrl),
      getWatermarkImage(),
    ]);
    const blob = await compositeWatermark(srcImg, wmImg);
    URL.revokeObjectURL(objectUrl);
    const previewUrl = URL.createObjectURL(blob);
    return { blob, objectUrl: previewUrl };
  } catch {
    URL.revokeObjectURL(objectUrl);
    throw new Error("Watermarking failed");
  }
}

/**
 * Watermark an image already accessible via URL.
 * Returns the watermarked Blob.
 * Throws if the image cannot be loaded (CORS or network error).
 */
export async function watermarkUrl(
  imageUrl: string,
): Promise<Blob> {
  const [srcImg, wmImg] = await Promise.all([
    loadImage(imageUrl),
    getWatermarkImage(),
  ]);
  return compositeWatermark(srcImg, wmImg);
}

/**
 * Upload a watermarked Blob to Supabase product-images storage and return
 * the public URL. Path will start with `products/wm-` so repeated processing
 * is always detected and skipped.
 */
export async function uploadWatermarkedBlob(
  blob: Blob,
  ext = "jpg",
): Promise<string> {
  const path = `products/wm-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error("Storage upload failed: " + error.message);
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

/** Returns true when the URL is already a watermarked product image */
export function isAlreadyWatermarked(url: string): boolean {
  return url.includes("/products/wm-");
}
