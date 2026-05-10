import { supabase } from "@/integrations/supabase/client";

/**
 * Get the proxied URL for an external image to avoid CORS issues.
 * For local/relative URLs or Supabase storage URLs, returns them as-is.
 */
export function getProxiedImageUrl(url: string | null | undefined): string {
  if (!url) return "/placeholder.svg";
  
  // If it's a relative URL, return as-is
  if (url.startsWith("/")) {
    return url;
  }
  
  // If it's already a Supabase storage URL, return as-is
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl && url.includes(supabaseUrl)) {
    return url;
  }
  
  // Normalize URL - add https:// if missing protocol
  let normalizedUrl = url;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    normalizedUrl = `https://${url}`;
  }
  
  // For external URLs, proxy through our edge function
  const proxyUrl = `${supabaseUrl}/functions/v1/proxy-image?url=${encodeURIComponent(normalizedUrl)}`;
  return proxyUrl;
}

/**
 * Check if an image URL is external (needs proxying)
 */
export function isExternalUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("/")) return false;
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl && url.includes(supabaseUrl)) return false;
  
  return url.startsWith("http://") || url.startsWith("https://") || !url.startsWith("/");
}
