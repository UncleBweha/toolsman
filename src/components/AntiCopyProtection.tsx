import { useEffect } from "react";

/**
 * AntiCopyProtection — Applies anti-copy, anti-scraping, and image-theft
 * protections to protected pages. Blocks right-click, drag-save,
 * long-press (mobile), and keyboard shortcuts on protected content.
 */
const AntiCopyProtection = () => {
  useEffect(() => {
    // ── 1. Context-menu (right-click) ──────────────────────────────────────
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Block on ALL images anywhere on the page
      if (target.tagName === "IMG") {
        e.preventDefault();
        return;
      }
      // Block on all other protected content areas
      if (
        target.closest("[data-protected]") ||
        target.closest(".product-content")
      ) {
        e.preventDefault();
      }
    };

    // ── 2. Keyboard shortcuts ──────────────────────────────────────────────
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (isInput) return;

      // Ctrl+C, Ctrl+U (view-source), Ctrl+S (save page), F12
      if (
        (e.ctrlKey && (e.key === "c" || e.key === "u" || e.key === "s")) ||
        e.key === "F12"
      ) {
        e.preventDefault();
      }
    };

    // ── 3. Drag-start on images ────────────────────────────────────────────
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG") {
        e.preventDefault();
      }
    };

    // ── 4. Apply draggable=false + no-touch-callout to all current images ──
    const protectImages = (root: Document | Element = document) => {
      const imgs = (root instanceof Document ? root : root).querySelectorAll<HTMLImageElement>("img");
      imgs.forEach((img) => {
        img.setAttribute("draggable", "false");
        (img.style as any).webkitTouchCallout = "none";
        img.style.userSelect = "none";
        // Prevent the browser from opening a context menu on the image element itself
        img.addEventListener("contextmenu", (e) => e.preventDefault(), { passive: false });
      });
    };

    protectImages();

    // ── 5. MutationObserver — protect dynamically added images ─────────────
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLImageElement) {
            node.setAttribute("draggable", "false");
            (node.style as any).webkitTouchCallout = "none";
            node.style.userSelect = "none";
            node.addEventListener("contextmenu", (e) => e.preventDefault(), { passive: false });
          } else if (node instanceof Element) {
            protectImages(node);
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // ── 6. CSS injection: global image hardening ───────────────────────────
    const style = document.createElement("style");
    style.id = "anti-copy-styles";
    style.textContent = `
      img {
        -webkit-touch-callout: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        user-select: none !important;
        pointer-events: auto;
      }
      [data-protected] img,
      .product-content img {
        pointer-events: none !important;
      }
      /* Prevent selection highlight on product content */
      [data-protected] {
        -webkit-user-select: none !important;
        user-select: none !important;
      }
    `;
    document.head.appendChild(style);

    document.addEventListener("contextmenu", handleContextMenu, { passive: false });
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("dragstart", handleDragStart);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("dragstart", handleDragStart);
      observer.disconnect();
      document.getElementById("anti-copy-styles")?.remove();
    };
  }, []);

  return null;
};

export default AntiCopyProtection;
