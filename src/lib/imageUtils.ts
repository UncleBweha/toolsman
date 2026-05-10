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
  
  // Return the original URL directly instead of passing through the edge function proxy
  // to prevent image loading failures if the proxy function isn't deployed.
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  
  return url;
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
