/**
 * ============================================================
 * TOOLSMAN KEY FEATURES PARSER — Comprehensive Test Suite
 * ============================================================
 *
 * Run with:  npx vitest run src/lib/featureParser.test.ts
 *
 * Coverage:
 *   Phase 2  — All supported input formats
 *   Phase 3  — Intelligent sentence splitting
 *   Phase 4  — Intelligent fragment merging (the core bug)
 *   Phase 5  — Data cleanup rules
 *   Phase 10 — Edge cases (fractions, measurements, mixed, AI/supplier content)
 */

import { describe, it, expect } from "vitest";
import { parseKeyFeatures, detectMalformedFeatures } from "./featureParser";

// ─────────────────────────────────────────────────────────────
// Phase 2 — Supported Input Formats
// ─────────────────────────────────────────────────────────────

describe("Format A — Newline-separated list", () => {
  it("splits correctly on \\n", () => {
    const input = "Durable chrome-vanadium steel\nErgonomic grip handle\nRust-resistant coating";
    const result = parseKeyFeatures(input);
    expect(result).toEqual([
      "Durable chrome-vanadium steel",
      "Ergonomic grip handle",
      "Rust-resistant coating",
    ]);
  });

  it("handles \\r\\n Windows line endings", () => {
    const input = "Feature one\r\nFeature two\r\nFeature three";
    expect(parseKeyFeatures(input)).toHaveLength(3);
  });

  it("strips trailing/leading blank lines", () => {
    const input = "\nFeature one\n\nFeature two\n";
    const result = parseKeyFeatures(input);
    expect(result).toHaveLength(2);
  });
});

describe("Format B — Period-separated sentences (paragraph)", () => {
  it("splits a clean sentence list on periods + capital", () => {
    const input =
      "Chrome vanadium construction. Includes 216 pieces. Features ergonomic handles. Comes with storage case.";
    const result = parseKeyFeatures(input);
    expect(result).toHaveLength(4);
    expect(result[0]).toBe("Chrome vanadium construction");
    expect(result[1]).toBe("Includes 216 pieces");
    expect(result[2]).toBe("Features ergonomic handles");
    expect(result[3]).toBe("Comes with storage case");
  });

  it("does NOT split on periods inside measurements like 3.5mm or 0.8Nm", () => {
    // "0.8 Nm torque" should NOT split at the decimal point
    const input = "Produces 0.8 Nm of torque. Works with most standard batteries.";
    const result = parseKeyFeatures(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toContain("0.8 Nm");
  });
});

describe("Format C — Bullet glyph separated (•, ●)", () => {
  it("strips • and splits correctly", () => {
    const input = "• Feature one\n• Feature two\n• Feature three";
    const result = parseKeyFeatures(input);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("Feature one");
  });

  it("strips ● bullets", () => {
    const input = "● Heavy duty construction\n● IP67 waterproof rating\n● 5 year warranty";
    const result = parseKeyFeatures(input);
    expect(result[0]).toBe("Heavy duty construction");
  });
});

describe("Format D — Markdown bullets (* or -)", () => {
  it("strips * prefix", () => {
    const input = "* Cordless design for portability\n* 20V max battery\n* Variable speed control";
    const result = parseKeyFeatures(input);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("Cordless design for portability");
    expect(result[1]).toBe("20V max battery");
  });
});

describe("Format E — Numbered list", () => {
  it("strips numbered prefix", () => {
    const input = "1. High-speed motor\n2. Dual-action mechanism\n3. Safety lock switch";
    const result = parseKeyFeatures(input);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("High-speed motor");
    expect(result[1]).toBe("Dual-action mechanism");
  });
});

describe("Format F — Mixed formats", () => {
  it("handles mixed bullets and plain text", () => {
    const input =
      "• Chrome-plated finish\n1. Ergonomic handle design\n* Anti-slip grip\nMeets ISO standards";
    const result = parseKeyFeatures(input);
    expect(result.length).toBeGreaterThanOrEqual(3);
  });
});

describe("Format G — Array input (from DB/API)", () => {
  it("accepts a clean string array", () => {
    const input = ["Feature one", "Feature two", "Feature three"];
    expect(parseKeyFeatures(input)).toHaveLength(3);
  });

  it("handles JSON-encoded array string", () => {
    const input = '["Feature one","Feature two","Feature three"]';
    const result = parseKeyFeatures(input);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("Feature one");
  });

  it("repairs a malformed array from the database", () => {
    // This is the exact bug: array stored with fragmented entries
    const input = [
      "Includes a vast array of metric sockets",
      "hex bits",
      "and extension bars for versatile access",
    ];
    const result = parseKeyFeatures(input);
    // Should be merged into 1 or 2 features — certainly not 3
    expect(result.length).toBeLessThan(3);
    // The final merged feature must contain all three fragments
    const merged = result.join(" ");
    expect(merged).toContain("metric sockets");
    expect(merged).toContain("hex bits");
    expect(merged).toContain("extension bars");
  });
});

// ─────────────────────────────────────────────────────────────
// Phase 3 — Intelligent Sentence Splitting
// ─────────────────────────────────────────────────────────────

describe("Phase 3 — Intelligent sentence splitting", () => {
  it("converts a supplier paragraph into individual features", () => {
    const input =
      "Chrome vanadium construction. Includes 216 pieces. Features ergonomic handles. Comes with storage case.";
    const result = parseKeyFeatures(input);
    expect(result).toHaveLength(4);
  });

  it("does NOT split on commas inside a sentence", () => {
    const input = "Compatible with 1/4\", 3/8\", and 1/2\" drive sockets";
    const result = parseKeyFeatures(input);
    // Must remain a single feature
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("1/4\"");
    expect(result[0]).toContain("3/8\"");
    expect(result[0]).toContain("1/2\"");
  });

  it("does NOT split a sentence that contains a comma mid-clause", () => {
    const input = "Features ergonomic, soft-grip handles for comfortable and efficient operation";
    const result = parseKeyFeatures(input);
    expect(result).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────
// Phase 4 — Intelligent Fragment Merging (THE CORE BUG)
// ─────────────────────────────────────────────────────────────

describe("Phase 4 — Fragment merging (core bug scenarios)", () => {
  it("merges fragment starting with 'and'", () => {
    // Exact example from the bug report
    const input = [
      "Features high-torque ratchets with ergonomic soft-grip handles for comfortable",
      "efficient operation",
    ];
    const result = parseKeyFeatures(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("comfortable");
    expect(result[0]).toContain("efficient operation");
  });

  it("merges measurement fragments (1/4\", 3/8\", 1/2\")", () => {
    const input = [
      "Complete set covers 1/4\"",
      "3/8\"",
      "and 1/2\" drive requirements",
    ];
    const result = parseKeyFeatures(input);
    // All should merge into one feature
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("1/4\"");
    expect(result[0]).toContain("3/8\"");
    expect(result[0]).toContain("1/2\"");
  });

  it("merges fragment starting with 'hex bits' that is too short", () => {
    const input = [
      "Includes a vast array of metric sockets",
      "hex bits",
      "and extension bars for versatile access",
    ];
    const result = parseKeyFeatures(input);
    expect(result.length).toBeLessThan(3);
  });

  it("merges fragment starting with lowercase", () => {
    const input = [
      "Delivers powerful torque output",
      "even in confined spaces",
    ];
    const result = parseKeyFeatures(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("even in confined spaces");
  });

  it("merges fragment starting with comma", () => {
    const input = [
      "Available in 6mm",
      ", 8mm and 10mm sizes",
    ];
    const result = parseKeyFeatures(input);
    expect(result).toHaveLength(1);
  });

  it("merges fragment starting with '&'", () => {
    const input = [
      "Suitable for wood",
      "& metal surfaces",
    ];
    const result = parseKeyFeatures(input);
    expect(result).toHaveLength(1);
  });

  it("does NOT merge two genuinely separate features", () => {
    const input = [
      "Includes 120-piece socket set with carry case",
      "Rated for 240V operation and 50Hz frequency",
    ];
    const result = parseKeyFeatures(input);
    expect(result).toHaveLength(2);
  });

  it("the complete bug-report example resolves correctly", () => {
    const input = [
      "Includes a vast array of metric sockets",
      "hex bits",
      "and extension bars for versatile access",
      "Features high-torque ratchets with ergonomic soft-grip handles for comfortable",
      "efficient operation",
      "Complete set covers 1/4\"",
      "3/8\"",
      "and 1/2\" drive requirements for diverse bolt sizes",
    ];
    const result = parseKeyFeatures(input);
    // Should produce exactly 3 clean features
    expect(result).toHaveLength(3);
    expect(result[0]).toContain("metric sockets");
    expect(result[1]).toContain("comfortable");
    expect(result[2]).toContain("1/4\"");
  });
});

// ─────────────────────────────────────────────────────────────
// Phase 5 — Data Cleanup Rules
// ─────────────────────────────────────────────────────────────

describe("Phase 5 — Data cleanup rules", () => {
  it("trims leading and trailing whitespace", () => {
    const input = ["  Feature with spaces  ", "\tTabbed feature\t"];
    const result = parseKeyFeatures(input);
    expect(result[0]).toBe("Feature with spaces");
    expect(result[1]).toBe("Tabbed feature");
  });

  it("removes duplicate features (case-insensitive)", () => {
    const input = ["Rust resistant", "rust resistant", "RUST RESISTANT", "Ergonomic grip"];
    const result = parseKeyFeatures(input);
    expect(result).toHaveLength(2);
  });

  it("removes empty entries", () => {
    const input = ["Feature one", "", "   ", "Feature two"];
    const result = parseKeyFeatures(input);
    expect(result).toHaveLength(2);
  });

  it("removes trailing periods from features", () => {
    const input = ["Chrome-plated finish.", "Ergonomic handle."];
    const result = parseKeyFeatures(input);
    expect(result[0]).not.toMatch(/\.$/);
    expect(result[1]).not.toMatch(/\.$/);
  });

  it("capitalises first letter of each feature", () => {
    const input = "durable construction\nergonomic handle";
    const result = parseKeyFeatures(input);
    expect(result[0]).toMatch(/^[A-Z]/);
    expect(result[1]).toMatch(/^[A-Z]/);
  });

  it("preserves technical specs: 1/4\", 3/8\", 1/2\" fractions", () => {
    const input = "Compatible with 1/4\", 3/8\", and 1/2\" drive sockets";
    const result = parseKeyFeatures(input);
    expect(result[0]).toContain("1/4\"");
    expect(result[0]).toContain("3/8\"");
    expect(result[0]).toContain("1/2\"");
  });

  it("preserves voltage ratings like 240V, 110V, 20V max", () => {
    const input = "Operates on 240V AC power\n20V max lithium battery";
    const result = parseKeyFeatures(input);
    expect(result[0]).toContain("240V");
    expect(result[1]).toContain("20V");
  });

  it("preserves dimensions like 150mm, 12cm, 5kg", () => {
    const input = "Blade length 150mm for precision cuts\nWeighs only 2.5kg";
    const result = parseKeyFeatures(input);
    expect(result[0]).toContain("150mm");
    expect(result[1]).toContain("2.5kg");
  });

  it("preserves model numbers and brand references", () => {
    const input = "Compatible with DEWALT DCS391\nWorks with Makita BHP452 series";
    const result = parseKeyFeatures(input);
    expect(result[0]).toContain("DEWALT DCS391");
    expect(result[1]).toContain("Makita BHP452");
  });

  it("rejects features starting with invalid tokens (and, &, comma, dot, /)", () => {
    const input = ["and more features", "& also this", ", plus another", ". And finally"];
    // These should either be merged or filtered out
    const result = parseKeyFeatures(input);
    for (const f of result) {
      expect(f).not.toMatch(/^(and |& |, |\. )/i);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// Phase 10 — Edge Cases
// ─────────────────────────────────────────────────────────────

describe("Edge cases — Null / Empty / Invalid input", () => {
  it("returns [] for null", () => {
    expect(parseKeyFeatures(null)).toEqual([]);
  });

  it("returns [] for undefined", () => {
    expect(parseKeyFeatures(undefined)).toEqual([]);
  });

  it("returns [] for empty string", () => {
    expect(parseKeyFeatures("")).toEqual([]);
  });

  it("returns [] for empty array", () => {
    expect(parseKeyFeatures([])).toEqual([]);
  });

  it("returns [] for array of empty strings", () => {
    expect(parseKeyFeatures(["", "   ", ""])).toEqual([]);
  });

  it("handles numeric input gracefully", () => {
    expect(() => parseKeyFeatures(42)).not.toThrow();
  });
});

describe("Edge cases — Long sentences", () => {
  it("handles a very long single feature without splitting it", () => {
    const input =
      "Manufactured from premium grade chrome vanadium steel with a phosphate and oil finish for outstanding durability and long service life in professional workshop environments";
    const result = parseKeyFeatures(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("chrome vanadium steel");
  });
});

describe("Edge cases — AI-generated content", () => {
  it("handles AI-generated numbered list", () => {
    const input = `1. Durable chrome-vanadium steel construction for long-lasting performance
2. 216-piece comprehensive socket set covering all common fastener sizes
3. Ergonomic soft-grip handle for comfortable extended use
4. Includes a premium blow-moulded storage case`;
    const result = parseKeyFeatures(input);
    expect(result).toHaveLength(4);
    expect(result[0]).toContain("chrome-vanadium");
    expect(result[0]).not.toMatch(/^1\./);
  });

  it("handles AI-generated bullet list", () => {
    const input = `• Powerful 18V brushless motor for extended runtime
• Three-speed settings for versatile applications
• Quick-release chuck for fast bit changes
• LED work light illuminates dark work areas`;
    const result = parseKeyFeatures(input);
    expect(result).toHaveLength(4);
    expect(result[0]).not.toMatch(/^•/);
  });
});

describe("Edge cases — Supplier-generated content", () => {
  it("handles supplier paragraph with mixed separators", () => {
    const input =
      "High quality tool set; includes ratchets, sockets and extension bars; chrome vanadium steel; lifetime warranty";
    const result = parseKeyFeatures(input);
    // Semicolons should be treated as list separators only if they produce valid features
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("handles Excel-imported content with extra whitespace", () => {
    const input = "  Durable steel  \n  Ergonomic handle  \n  Rust resistant  ";
    const result = parseKeyFeatures(input);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("Durable steel");
  });

  it("handles supplier copy with dashes as list markers", () => {
    const input = "- Heavy-duty steel frame\n- Non-slip rubber base\n- Easy assembly";
    const result = parseKeyFeatures(input);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("Heavy-duty steel frame");
  });
});

describe("Edge cases — Measurements and fractions", () => {
  it("preserves imperial fractions: 1/4\", 3/8\", 1/2\", 3/4\"", () => {
    const input =
      "Fits 1/4\" drive, 3/8\" drive, 1/2\" drive, and 3/4\" drive ratchets";
    const result = parseKeyFeatures(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("1/4\"");
    expect(result[0]).toContain("3/4\"");
  });

  it("preserves metric measurements in features", () => {
    const input = [
      "Jaw capacity: 1.5mm to 13mm",
      "Chuck size: 10mm keyed",
      "Cable length: 2.5m",
    ];
    const result = parseKeyFeatures(input);
    expect(result).toHaveLength(3);
    expect(result[0]).toContain("13mm");
    expect(result[1]).toContain("10mm");
    expect(result[2]).toContain("2.5m");
  });
});

// ─────────────────────────────────────────────────────────────
// detectMalformedFeatures
// ─────────────────────────────────────────────────────────────

describe("detectMalformedFeatures — detection accuracy", () => {
  it("correctly identifies clean features as not malformed", () => {
    const features = [
      "Includes 120-piece socket set with carry case",
      "Rated for 240V AC operation",
      "Chrome-vanadium steel construction for durability",
    ];
    const { isMalformed, score } = detectMalformedFeatures(features);
    expect(isMalformed).toBe(false);
    expect(score).toBeLessThan(0.15);
  });

  it("correctly flags features starting with 'and' as malformed", () => {
    const features = [
      "Includes a vast array of metric sockets",
      "and extension bars for versatile access",
    ];
    const { isMalformed, score } = detectMalformedFeatures(features);
    expect(isMalformed).toBe(true);
    expect(score).toBeGreaterThan(0.15);
  });

  it("correctly flags features starting with lowercase as malformed", () => {
    const features = [
      "Ergonomic soft-grip handles for comfortable",
      "efficient operation in tight spaces",
    ];
    const { isMalformed } = detectMalformedFeatures(features);
    expect(isMalformed).toBe(true);
  });

  it("returns false for empty array", () => {
    const { isMalformed } = detectMalformedFeatures([]);
    expect(isMalformed).toBe(false);
  });

  it("provides reasons for detection", () => {
    const features = ["and this is clearly a fragment", "hex bits"];
    const { reasons } = detectMalformedFeatures(features);
    expect(reasons.length).toBeGreaterThan(0);
  });
});
