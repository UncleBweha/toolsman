import { useEffect } from "react";

/**
 * AntiCopyProtection — Applies anti-copy, anti-scraping, and anti-hotlinking
 * protections to protected pages. Mount this component on pages that need protection.
 */
const AntiCopyProtection = () => {
  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Only block on protected content areas (not form inputs)
      if (target.closest("[data-protected]") || target.closest(".product-content")) {
        e.preventDefault();
      }
    };

    // Block common keyboard shortcuts for copying
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (isInput) return; // Allow shortcuts in input fields

      // Ctrl+C, Ctrl+U (view source), Ctrl+S (save), F12 (dev tools)
      if (
        (e.ctrlKey && (e.key === "c" || e.key === "u" || e.key === "s")) ||
        e.key === "F12"
      ) {
        e.preventDefault();
      }
    };

    // Disable drag-save for images
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG" && target.closest("[data-protected]")) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("dragstart", handleDragStart);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("dragstart", handleDragStart);
    };
  }, []);

  return null;
};

export default AntiCopyProtection;
