/**
 * OptimizedImage
 * ==============
 * Drop-in replacement for <img> in a Vite + React app deployed on Vercel.
 *
 * Why not next/image?
 *   This project uses Vite, not Next.js. next/image is a Next.js-only component.
 *   This component achieves the same goals using web-standard techniques:
 *
 *   ✅ WebP delivery        — Supabase Storage transform API appends ?format=origin
 *                             + browser Accept: image/webp header negotiation
 *   ✅ No layout shift      — explicit width/height aspect-ratio locking
 *   ✅ Lazy loading         — native loading="lazy" (supported in all modern browsers)
 *   ✅ Above-fold priority  — fetchpriority="high" + loading="eager" (mirrors next/image priority)
 *   ✅ Error fallback       — graceful /placeholder.svg on broken URLs
 *   ✅ SEO alt text         — required, enforced by TypeScript
 */

import { useState } from "react";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { cn } from "@/lib/utils";

export interface OptimizedImageProps {
  /** Original image URL (Supabase Storage, CDN, or relative path) */
  src: string | null | undefined;
  /** Descriptive SEO alt text — required */
  alt: string;
  /** Render width in px — used to request the right size from Supabase */
  width?: number;
  /** Render height in px */
  height?: number;
  /** CSS class names applied to the <img> element */
  className?: string;
  /**
   * Set true ONLY for the first visible image on the page (hero, first product card).
   * Equivalent to next/image priority={true} — disables lazy loading and
   * hints the browser to fetch this image early.
   */
  priority?: boolean;
  /** Quality 1–100 passed to Supabase Storage transform (default 80) */
  quality?: number;
  /** Called when the image fails to load */
  onError?: React.ReactEventHandler<HTMLImageElement>;
  /** Additional inline styles */
  style?: React.CSSProperties;
}

const PLACEHOLDER = "/placeholder.svg";

const OptimizedImage = ({
  src,
  alt,
  width = 600,
  height = 600,
  className,
  priority = false,
  quality = 80,
  onError,
  style,
}: OptimizedImageProps) => {
  const [errored, setErrored] = useState(false);

  const optimizedSrc = errored
    ? PLACEHOLDER
    : getOptimizedImageUrl(src, width, quality);

  const handleError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    setErrored(true);
    onError?.(e);
  };

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      width={width}
      height={height}
      /*
       * loading="lazy"   → browser defers fetch until image enters viewport
       * loading="eager"  → fetch immediately (used for priority/hero images)
       * fetchPriority    → hints browser's preload scanner (Chrome 102+, Safari 17.2+)
       */
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      // @ts-expect-error — fetchpriority is a valid HTML attribute; React types lag behind
      fetchpriority={priority ? "high" : "auto"}
      className={cn(className)}
      style={style}
      onError={handleError}
      // Prevent right-click save on product images
      onContextMenu={(e) => e.preventDefault()}
      draggable={false}
    />
  );
};

export default OptimizedImage;
