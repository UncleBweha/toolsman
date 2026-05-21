/**
 * tagExtractor.ts
 * Client-side NLP keyword extractor — no external API required.
 * Extracts the most relevant product tags from a description string.
 */

// ── Stop-words to ignore ──────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  // English articles / conjunctions / prepositions
  "a","an","the","and","or","but","for","nor","so","yet","at","by","in","of",
  "on","to","up","as","is","it","its","be","do","if","he","me","my","we","us",
  "am","are","was","were","has","had","have","not","no","can","may","this","that",
  "with","from","into","than","then","also","both","each","few","more","most",
  "other","over","same","such","very","just","when","where","which","while",
  "who","whom","will","would","could","should","shall","might","must","only",
  "about","after","before","between","during","here","how","our","out","own",
  "per","some","their","them","there","these","they","those","through","under",
  "until","upon","using","via","what","your","yours","you",
  // Filler adjectives common in product copy
  "good","great","nice","best","high","new","old","many","much","well","wide",
  "made","used","come","comes","get","give","keep","let","make","need","take",
  "use","way","ways","set","sets","time","times","type","types","kind","kinds",
  "product","item","model","version","number","kit","pack","unit","units",
  "ideal","perfect","suitable","available","designed","built","includes","included",
  "provides","features","allows","ensures","comes","compatible","easy","simple",
]);

// ── Minimum meaningful word length ────────────────────────────────────────────
const MIN_WORD_LEN = 3;
// ── Max tags to return ────────────────────────────────────────────────────────
const MAX_TAGS = 15;

/**
 * Strip HTML tags and decode common HTML entities from a string.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tokenise a plain-text string into normalised word tokens.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    // Remove punctuation except hyphens (keep "long-life", "dust-proof")
    .replace(/[^a-z0-9\-\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^-+|-+$/g, "")) // strip leading/trailing hyphens
    .filter((w) => w.length >= MIN_WORD_LEN && !STOP_WORDS.has(w));
}

/**
 * Score tokens by frequency and position (earlier = higher weight).
 */
function scoreTokens(tokens: string[]): Map<string, number> {
  const scores = new Map<string, number>();
  const total = tokens.length;
  tokens.forEach((token, idx) => {
    // Frequency score (base) + position bonus (earlier words score more)
    const positionBonus = 1 + (1 - idx / total) * 0.3;
    scores.set(token, (scores.get(token) ?? 0) + positionBonus);
  });
  return scores;
}

/**
 * Extract a set of bi-grams (two consecutive words) that might be better
 * as a compound tag, e.g. "long lighting time", "dust proof".
 */
function extractBigrams(tokens: string[]): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return bigrams;
}

/**
 * Main exported function.
 * 
 * @param description - Raw product description (may contain HTML)
 * @param existingTags - Currently manual tags to merge/deduplicate
 * @returns Array of tag strings, sorted by relevance
 */
export function extractTags(
  description: string,
  existingTags: string[] = []
): string[] {
  if (!description?.trim()) return existingTags;

  const plain = stripHtml(description);
  const tokens = tokenize(plain);

  if (tokens.length === 0) return existingTags;

  const scores = scoreTokens(tokens);

  // Include bigrams that appear more than once (strong compound phrases)
  const bigrams = extractBigrams(tokens);
  const bigramCounts = new Map<string, number>();
  bigrams.forEach((bg) => bigramCounts.set(bg, (bigramCounts.get(bg) ?? 0) + 1));
  bigramCounts.forEach((count, bg) => {
    if (count >= 2) scores.set(bg, (scores.get(bg) ?? 0) + count * 1.5);
  });

  // Sort by score descending
  const sorted = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([token]) => token);

  // Merge auto-generated + existing manual tags, deduplicate
  const merged = Array.from(
    new Set([...sorted.slice(0, MAX_TAGS), ...existingTags.map((t) => t.toLowerCase().trim())])
  ).filter(Boolean);

  return merged.slice(0, MAX_TAGS + existingTags.length);
}

/**
 * Generates tags from both description AND product name for better coverage.
 */
export function extractProductTags(
  name: string,
  description: string,
  existingTags: string[] = []
): string[] {
  const nameTags = tokenize(name);
  const descTags = extractTags(description, []);
  const merged = Array.from(new Set([...nameTags, ...descTags, ...existingTags.map((t) => t.toLowerCase().trim())]));
  return merged.slice(0, MAX_TAGS + existingTags.length);
}
