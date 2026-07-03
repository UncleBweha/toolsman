import { supabase } from "@/integrations/supabase/client";

/**
 * Get the proxied URL for an external image to avoid CORS issues.
 * For local/relative URLs or Supabase storage URLs, returns them as-is.
 */
export function getProxiedImageUrl(url: string | null | undefined): string {
  if (!url) return "/placeholder.svg";

  // Relative URL — return as-is
  if (url.startsWith("/")) return url;

  // Ensure protocol
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }

  return url;
}

/**
 * Get the display URL for an image — currently identical to getProxiedImageUrl.
 *
 * NOTE: Supabase Storage image transforms (WebP resizing) require the Pro plan.
 * We intentionally do NOT append ?width= / ?quality= / ?format= params here
 * because those return HTTP 400 on the free tier and break image loading.
 *
 * The OptimizedImage component still provides:
 *   ✅ loading="lazy" / loading="eager"
 *   ✅ fetchpriority hint for above-the-fold images
 *   ✅ decoding="async" / "sync"
 *   ✅ Graceful error fallback
 *   ✅ SEO-friendly alt text
 *
 * When you upgrade to Supabase Pro, uncomment the block below:
 *
 *   if (url.includes(".supabase.co/storage/")) {
 *     const sep = url.includes("?") ? "&" : "?";
 *     return `${url}${sep}width=${width}&quality=${quality}&format=origin`;
 *   }
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  _width = 600,
  _quality = 80
): string {
  return getProxiedImageUrl(url);
}

/**
 * Check if an image URL is external (needs proxying)
 */
export function isExternalUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("/")) return false;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (supabaseUrl && url.includes(supabaseUrl)) return false;

  return url.startsWith("http://") || url.startsWith("https://") || !url.startsWith("/");
}

/**
 * Generate descriptive SEO alt text for a product image.
 * Falls back to the product name if no context is provided.
 */
export function getProductAlt(
  name: string,
  brand?: string | null,
  context = "available in Kenya"
): string {
  const parts = [brand, name, context].filter(Boolean);
  return parts.join(" ");
}
