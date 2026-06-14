/**
 * ============================================================
 * TOOLSMAN KEY FEATURES PARSER  — Production-Grade Engine
 * ============================================================
 *
 * Accepts any of the following input formats:
 *
 *   A) Plain newline-separated list  (newline = feature boundary)
 *   B) Sentence paragraph            ("Feature one. Feature two.")
 *   C) Bullet glyphs                 (•, ●, ◦, ‣)
 *   D) Markdown bullets              (* item  /  - item)
 *   E) Numbered list                 (1. item  /  1) item)
 *   F) Mixed / supplier copy-paste
 *   G) Array (from DB / API)
 *   H) JSON string encoding an array
 *
 * Core design decisions
 * ─────────────────────
 *  • Newlines are the primary split boundary — they are intentional separators.
 *  • Commas inside a feature are NEVER split — they are part of the sentence.
 *  • Periods split ONLY when they clearly end a complete sentence AND the next
 *    token starts with an uppercase letter (i.e. a new sentence), or when the
 *    whole chunk reads as a period-delimited list (no commas inside sentences).
 *  • After splitting, a "fragment healing" pass merges any fragment that looks
 *    like a continuation of the previous item:
 *      - starts with a conjunction:  and, or, but, &
 *      - starts with a punctuation:  , ; /
 *      - starts with a measurement:  3/8", 1/2", 240V, 12mm, etc.
 *      - starts with a lowercase letter (clearly not a new sentence)
 *      - is fewer than 3 meaningful words and does not stand alone
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

/** Characters/glyphs used as bullet markers that should be stripped. */
const BULLET_STRIP = /^[\s\u00A0]*[•●◦‣\-\*\u2022\u2023]+[\s\u00A0]*/;

/** Numbered list prefix: "1.", "2)", "i.", "(a)", etc. */
const NUMBERED_PREFIX = /^[\s]*(?:\(?[0-9]{1,3}[.)]\s*|[ivxIVX]{1,5}[.)]\s*|\([a-zA-Z]\)\s*)/;

/** Patterns that signal the fragment is a continuation of the previous item. */
const CONTINUATION_STARTERS = [
  /^and\b/i,
  /^or\b/i,
  /^but\b/i,
  /^&\s/,
  /^\+\s/,
  /^[,;\/]/,
  // Fragment starts with a fraction/measurement: 1/4", 3/8", 240V, 12mm, etc.
  /^[\d]+\s*[/\\][\d]+["′'"]?/,
  /^[\d]+\s*(mm|cm|m|kg|g|lb|oz|v|vac|hz|w|a|rpm|nm|°|degrees?)\b/i,
  // Fragment starts with a lowercase letter → definitely a continuation
  /^[a-z]/,
];

/** Minimum word count for a feature to stand alone (ignores spec-like items). */
const MIN_WORDS = 3;

/** Looks like a standalone spec: "240V", "M12", "IP67", "2.5kg", "1/4" drive". */
const SPEC_PATTERN = /^[\w\d\s\/\-\.°'"]+$/;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function stripBullet(s: string): string {
  return s.replace(BULLET_STRIP, "").replace(NUMBERED_PREFIX, "").trim();
}

function isContinuation(fragment: string): boolean {
  const f = fragment.trim();
  return CONTINUATION_STARTERS.some((re) => re.test(f));
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function isValidSpec(s: string): boolean {
  return SPEC_PATTERN.test(s) && s.length > 0;
}

function isTooShort(s: string): boolean {
  return wordCount(s) < MIN_WORDS && !isValidSpec(s);
}

/** Capitalises the first letter of a string. */
function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Given a raw flat array of string chunks (already split by primary delimiters),
 * heal fragments that are clearly continuations of the previous item.
 */
function healFragments(parts: string[]): string[] {
  const out: string[] = [];
  for (const raw of parts) {
    const part = raw.trim();
    if (!part) continue;

    if (out.length === 0) {
      out.push(part);
      continue;
    }

    // Decide whether this part should be merged onto the previous
    const shouldMerge =
      isContinuation(part) ||       // starts with conjunction/punct/measurement/lowercase
      isTooShort(part);             // too short to stand alone

    if (shouldMerge) {
      const prev = out[out.length - 1];
      // Join with a comma when the fragment starts with a measurement or conjunction
      // (skip if it already starts with punctuation)
      const joinWith = /^[,;\/]/.test(part) ? "" : ", ";
      out[out.length - 1] = prev + joinWith + part;
    } else {
      out.push(part);
    }
  }
  return out;
}

/**
 * Split a single text chunk intelligently.
 *
 * Strategy:
 *  1. If it contains newlines → split on newlines (most reliable separator).
 *  2. Else if it looks like a "sentence list" (each sentence ends with "." and
 *     starts with an uppercase word, and has no inline commas between sentences):
 *     split on periods.
 *  3. Else treat the whole chunk as one feature.
 */
function splitChunk(chunk: string): string[] {
  // ── Step 1: newlines ──────────────────────────────────────────────────────
  if (/[\n\r]/.test(chunk)) {
    return chunk
      .split(/[\n\r]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // ── Step 2: bullet/numbered list in a single line (rare but possible) ─────
  // e.g. "• Feature A • Feature B" or "1. A 2. B"
  if (/[•●◦‣]/.test(chunk)) {
    return chunk
      .split(/[•●◦‣]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // ── Step 3: numbered inline list "1. A 2. B 3. C" ───────────────────────
  // Only if the pattern appears at least twice
  if (/\b[0-9]+\.\s/.test(chunk)) {
    const numberedSplit = chunk.split(/(?<!\d)(?=[0-9]+\.\s)/).map((s) => s.trim()).filter(Boolean);
    if (numberedSplit.length > 1) return numberedSplit;
  }

  // ── Step 4: period-as-sentence-boundary ──────────────────────────────────
  // Only use periods as delimiters when EACH resulting piece begins with an
  // uppercase letter (indicating a real new sentence), AND none of the pieces
  // looks like it was cut mid-measurement (e.g. "1/4" → never has a period).
  if (/\.\s+[A-Z]/.test(chunk)) {
    // Split on ". " only when followed by a capital
    const sentenceParts = chunk
      .split(/\.\s+(?=[A-Z])/)
      .map((s) => s.replace(/\.$/, "").trim())
      .filter(Boolean);

    if (sentenceParts.length > 1) {
      return sentenceParts;
    }
  }

  // ── Fallback: whole chunk is one feature ─────────────────────────────────
  return [chunk];
}

// ─────────────────────────────────────────────────────────────
// Validation / Cleanup Rules
// ─────────────────────────────────────────────────────────────

/**
 * Returns true if the feature passes all validation rules.
 * Rules:
 *  - Not empty
 *  - Does not start with: and, &, ,, ., /  (after stripping bullets)
 *  - Is either a valid spec string OR has at least MIN_WORDS words
 */
function isValidFeature(feature: string): boolean {
  const f = feature.trim();
  if (!f) return false;

  // Reject features that start with invalid tokens (healing should have fixed these,
  // but just in case they slipped through)
  if (/^(and|&|,|\.|\/)/i.test(f)) return false;

  // Must have some minimum content
  if (wordCount(f) < MIN_WORDS && !isValidSpec(f)) return false;

  return true;
}

/**
 * Final cleanup for an individual feature string:
 *  - Trim whitespace
 *  - Remove trailing periods (feature lists don't use periods)
 *  - Remove leading bullet/number artifacts
 *  - Capitalise first letter
 */
function cleanFeature(raw: string): string {
  let f = raw.trim();
  f = stripBullet(f);
  f = f.replace(/\.+$/, "").trim();   // remove trailing periods
  f = f.replace(/^["']|["']$/g, "").trim(); // remove surrounding quotes
  f = capitalize(f);
  return f;
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * parseKeyFeatures
 * ================
 * Normalises any raw key-feature input into a clean, deduplicated list of
 * marketplace-quality bullet points.
 *
 * @param input  - string | string[] | null | undefined | unknown
 * @returns      - string[] of cleaned, validated feature strings
 */
export function parseKeyFeatures(input: unknown): string[] {
  if (input === null || input === undefined) return [];
  if (input === "") return [];

  // ── Normalise to a raw string array ────────────────────────────────────────
  let raw: string[];

  if (Array.isArray(input)) {
    raw = input.map((x) => String(x ?? "").trim()).filter(Boolean);
  } else {
    const str = String(input).trim();
    if (!str) return [];

    // Handle JSON-encoded array string: '["feature1","feature2"]'
    if (str.startsWith("[") && str.endsWith("]")) {
      try {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed)) {
          raw = parsed.map((x: unknown) => String(x ?? "").trim()).filter(Boolean);
        } else {
          raw = [str];
        }
      } catch {
        raw = [str];
      }
    } else {
      raw = [str];
    }
  }

  // ── Split each raw chunk into candidate features ───────────────────────────
  const candidates: string[] = [];
  for (const chunk of raw) {
    const c = chunk.trim();
    if (!c) continue;
    const parts = splitChunk(c);
    candidates.push(...parts);
  }

  // ── Strip bullets/numbering from each candidate ───────────────────────────
  const stripped = candidates.map(stripBullet).filter(Boolean);

  // ── Heal fragments (merge continuations) ──────────────────────────────────
  const healed = healFragments(stripped);

  // ── Final cleanup and validation ──────────────────────────────────────────
  const cleaned = healed
    .map(cleanFeature)
    .filter(isValidFeature);

  // ── Deduplicate (case-insensitive, preserve first occurrence) ─────────────
  const seen = new Set<string>();
  return cleaned.filter((f) => {
    const key = f.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * detectMalformedFeatures
 * =======================
 * Analyses an existing features array and returns a confidence score
 * indicating how likely it is to contain malformed/fragmented entries.
 *
 * Returns:
 *  - isMalformed: boolean   (true = likely needs repair)
 *  - score: number          (0–1, higher = more confident it's malformed)
 *  - reasons: string[]      (human-readable diagnostics)
 */
export function detectMalformedFeatures(features: string[]): {
  isMalformed: boolean;
  score: number;
  reasons: string[];
} {
  if (!features || features.length === 0) {
    return { isMalformed: false, score: 0, reasons: [] };
  }

  const reasons: string[] = [];
  let score = 0;

  for (const f of features) {
    const trimmed = f.trim();

    // Starts with a conjunction → clear fragment
    if (/^(and|or|but|&)\b/i.test(trimmed)) {
      reasons.push(`Fragment starts with conjunction: "${trimmed.slice(0, 40)}"`);
      score += 0.4;
    }

    // Starts with a comma or slash
    if (/^[,\/]/.test(trimmed)) {
      reasons.push(`Fragment starts with punctuation: "${trimmed.slice(0, 40)}"`);
      score += 0.4;
    }

    // Too short (< MIN_WORDS) and not a spec
    if (isTooShort(trimmed) && !isValidSpec(trimmed)) {
      reasons.push(`Suspiciously short fragment: "${trimmed.slice(0, 40)}"`);
      score += 0.2;
    }

    // Starts with lowercase (unlikely to be a proper feature start)
    if (/^[a-z]/.test(trimmed)) {
      reasons.push(`Fragment starts with lowercase: "${trimmed.slice(0, 40)}"`);
      score += 0.3;
    }
  }

  // Normalise score
  const normalisedScore = Math.min(1, score / features.length);

  return {
    isMalformed: normalisedScore > 0.15,
    score: normalisedScore,
    reasons: [...new Set(reasons)], // deduplicate reasons
  };
}
