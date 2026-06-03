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
      img.onerror = () => {
        // Fallback 1: corsproxy.io (unencoded)
        const proxy1 = `https://corsproxy.io/?${data.publicUrl}`;
        const retryImg = new Image();
        retryImg.crossOrigin = "anonymous";
        retryImg.onload = () => { cachedWatermarkImg = retryImg; resolve(); };
        retryImg.onerror = () => {
          // Fallback 2: allorigins.win (encoded)
          const proxy2 = `https://api.allorigins.win/raw?url=${encodeURIComponent(data.publicUrl)}`;
          const retryImg2 = new Image();
          retryImg2.crossOrigin = "anonymous";
          retryImg2.onload = () => { cachedWatermarkImg = retryImg2; resolve(); };
          retryImg2.onerror = () => resolve();
          retryImg2.src = proxy2;
        };
        retryImg.src = proxy1;
      };
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
  ctx.globalAlpha = 0.55; // 55% opacity for logo

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
    ctx.globalAlpha   = 0.35; // 35% opacity
    ctx.fillStyle     = "#000000";
    ctx.fillText("TOOLSMAN", x + 2, y + 2);

    // Gold text
    ctx.globalAlpha = 0.55; // 55% opacity
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

// ── fetch image bytes with timeout → local blob: URL (no CORS taint on canvas) ─
const FETCH_TIMEOUT_MS = 6000;

async function fetchAsBlob(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { mode: "cors", signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) {
      throw new Error(`Content type ${blob.type} is not an image`);
    }
    return URL.createObjectURL(blob);
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out (6s)");
    }
    throw err;
  }
}

// ── load any image — races all proxies simultaneously for max speed ───────────
async function loadImage(src: string): Promise<HTMLImageElement> {
  // blob/data URLs — load directly, no CORS needed
  if (src.startsWith("blob:") || src.startsWith("data:")) {
    return loadImgElement(src);
  }

  if (src.startsWith("http")) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
    const localProxy = `${supabaseUrl}/functions/v1/proxy-image?url=${encodeURIComponent(src)}`;

    const proxies = [
      localProxy,                                                       // Supabase Custom Proxy (with real browser headers)
      src,                                                              // direct
      `https://corsproxy.io/?${src}`,                                  // corsproxy
      `https://api.allorigins.win/raw?url=${encodeURIComponent(src)}`, // allorigins
      `https://thingproxy.freeboard.io/fetch/${src}`,                  // thingproxy
    ];

    const racers = proxies.map(async (proxyUrl) => {
      let blobUrl = "";
      try {
        blobUrl = await fetchAsBlob(proxyUrl);
        const img = await loadImgElement(blobUrl);
        return img;
      } catch (err) {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        const urlObj = new URL(proxyUrl);
        const name = urlObj.pathname.includes("/proxy-image")
          ? "supabase-proxy"
          : urlObj.searchParams.get("url") && !urlObj.hostname.includes("supabase.co")
            ? `allorigins (${new URL(urlObj.searchParams.get("url")!).hostname})`
            : urlObj.hostname === new URL(src).hostname
              ? "direct"
              : urlObj.hostname;
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`[${name}]: ${msg}`);
      }
    });

    try {
      return await (Promise as any).any(racers);
    } catch (err) {
      const aggErr = err as any;
      const details = aggErr.errors ? aggErr.errors.map((e: any) => e.message).join(" · ") : "Unknown error";
      throw new Error(`Failed to load image via all proxies: ${details}`);
    }

  }

  return loadImgElement(src);
}

function loadImgElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("blob:")) img.crossOrigin = "anonymous";
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error(`Image element failed to load: ${src}`));
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

function getAbsoluteImageUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  let cleanPath = url;
  if (cleanPath.startsWith("/")) {
    cleanPath = cleanPath.substring(1);
  }

  const storagePrefix = "storage/v1/object/public/product-images/";
  if (cleanPath.startsWith(storagePrefix)) {
    cleanPath = cleanPath.substring(storagePrefix.length);
  }

  const { data } = supabase.storage.from("product-images").getPublicUrl(cleanPath);
  return data.publicUrl;
}

/**
 * Watermark an image already accessible via URL.
 * Returns the watermarked Blob.
 * Throws if the image cannot be loaded (CORS or network error).
 */
export async function watermarkUrl(
  imageUrl: string,
): Promise<Blob> {
  const absoluteUrl = getAbsoluteImageUrl(imageUrl);
  const [srcImg, wmImg] = await Promise.all([
    loadImage(absoluteUrl),
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
  const rand = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).substring(2, 10);
  const path = `products/wm-${Date.now()}-${rand}.${ext}`;
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

/**
 * Watermark a product's images (primary and additional) in the background.
 * Once completed, updates the product row in Supabase and triggers an optional callback.
 */
export async function watermarkProduct(
  productId: string,
  imageUrl: string | null,
  images: string[],
  onComplete?: () => void
): Promise<void> {
  let updatedImageUrl = imageUrl;
  let hasChanges = false;

  if (imageUrl && !isAlreadyWatermarked(imageUrl)) {
    try {
      const blob = await watermarkUrl(imageUrl);
      const pubUrl = await uploadWatermarkedBlob(blob);
      updatedImageUrl = pubUrl;
      hasChanges = true;
    } catch (err) {
      console.error(`Background watermark failed for product ${productId} primary image:`, err);
    }
  }

  const updatedImages: string[] = [];
  for (const url of images) {
    if (!url) continue;
    if (isAlreadyWatermarked(url)) {
      updatedImages.push(url);
      continue;
    }
    try {
      const blob = await watermarkUrl(url);
      const pubUrl = await uploadWatermarkedBlob(blob);
      updatedImages.push(pubUrl);
      hasChanges = true;
    } catch (err) {
      console.error(`Background watermark failed for product ${productId} additional image:`, err);
      updatedImages.push(url);
    }
  }

  if (hasChanges) {
    try {
      const { error } = await supabase
        .from("products")
        .update({
          image_url: updatedImageUrl,
          images: updatedImages
        })
        .eq("id", productId);

      if (error) throw error;
      if (onComplete) onComplete();
    } catch (err) {
      console.error(`Failed to update database with watermarked URLs for product ${productId}:`, err);
    }
  }
}
