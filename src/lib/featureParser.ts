/**
 * Normalises raw key-feature input into a clean list of bullet points.
 *
 * Accepts:
 *   - A single string like "Durable. Easy install. Rust-resistant."
 *   - A comma- or newline-separated string
 *   - An array (from the DB) where any element may itself contain
 *     multiple full-stop separated features
 *
 * Splits primarily on full stops, then on newlines/semicolons/bullets,
 * and finally on commas (only if no other separators were present).
 * Strips bullet glyphs, trims whitespace, and removes empties / dupes.
 */
export function parseKeyFeatures(input: unknown): string[] {
  if (!input) return [];

  const raw: string[] = Array.isArray(input)
    ? input.map((x) => String(x ?? ""))
    : [String(input)];

  const out: string[] = [];
  for (const chunk of raw) {
    if (!chunk) continue;
    // Split on . ; newlines and bullet glyphs first
    let parts = chunk.split(/[.;\n\r]+|\s•\s|\s-\s/);
    // If nothing split and the chunk looks like a CSV, fall back to comma
    if (parts.length === 1 && chunk.includes(",")) {
      parts = chunk.split(",");
    }
    for (let p of parts) {
      p = p
        .replace(/^[\s•●\-\*\u2022]+/, "")
        .replace(/[\s\u00A0]+$/g, "")
        .trim();
      if (p) out.push(p);
    }
  }

  // Deduplicate (case-insensitive) while preserving order
  const seen = new Set<string>();
  return out.filter((f) => {
    const k = f.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
