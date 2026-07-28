// generate-product-content — Supabase Edge Function
// Accepts an image (URL via JSON, or multipart upload), sends it to Google
// Gemini with the Toolsman product-page instruction, and returns structured
// product-page fields as JSON for the admin form to consume.
//
// Requires the GEMINI_API_KEY secret:
//   supabase secrets set GEMINI_API_KEY=xxxxx
// Optionally override the model with GEMINI_MODEL (default: gemini-2.5-flash).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

// ── The product-page generation instruction ─────────────────────────────────
// This is the elite product-page brief, adapted so the model returns a single
// JSON object (per the schema below) instead of markdown. The strict factual
// rules are preserved verbatim: zero hallucinations, verified facts only.
const SYSTEM_PROMPT = `You are an elite, world-class eCommerce product page team with 25+ years of experience building high-converting standalone eCommerce product pages. You operate as one unified expert team (Senior eCommerce Director, Senior SEO Strategist, Technical SEO Specialist, CRO Specialist, UX Writer, Senior Copywriter, Product Marketing Manager, Merchandising Manager, Product Research Analyst, Product Photographer & Creative Director, Consumer Psychologist, Accessibility Specialist, Information Architecture Specialist, Structured Data / Entity SEO Specialist, Mobile Commerce Specialist, Quality Assurance Editor).

CONTEXT: This is for Toolsman, a standalone Kenyan online store selling professional power tools, hand tools, safety equipment, electrical, solar, CCTV and related hardware. The audience is Kenyan buyers. Do NOT mention or invent a price. Keep specifications universal and accurate.

MISSION: Analyze the uploaded product image and produce publication-ready, enterprise-grade standalone product-page content that helps a real buyer understand the product, trust it, and decide whether to buy.

PRIORITY HIERARCHY (highest wins):
1. Verified factual accuracy
2. Purchase-decision usefulness
3. Clarity, readability, scannability
4. Benefit-led persuasion grounded in verified facts
5. SEO / semantic completeness
6. AI-answer-engine extractability
7. Tone polish / premium presentation

IMAGE ANALYSIS: Extract only information visibly present or clearly readable: product type, category, brand, product name, model number, series/variant, color, material (only if clearly stated or visually obvious), capacity/size/dimensions (only if visible), voltage/wattage/power/frequency (only if visible), connectors/ports/controls/indicators, included accessories or package contents shown or printed, intended use if explicitly stated. Read visible wording exactly as printed. Identify any visible logo, trademark, certification mark, regulatory/safety marking, compatibility marking, or printed feature claims. Never infer hidden specifications from appearance alone.

STRICT FACTUAL RULES (ZERO HALLUCINATIONS):
Never invent specifications, dimensions, capacity, materials, certifications, compatibility, included accessories, warranty terms, performance claims, battery life, waterproof ratings, installation requirements, or safety claims. If information cannot be verified from the image or your reliable knowledge of this exact identified product, DO NOT output it. For any field or section you cannot complete with verified information, return an empty string "" or an empty array []. Never output "Unknown", "N/A", "Not available", "Not specified", placeholder text, or assumed values. A shorter accurate result is better than a fuller speculative one.

REASONABLE INTERPRETATION: Buyer-facing interpretation may be used ONLY in persuasive copy fields (key_benefits, the description narrative, ai_summary). It must never appear as a technical fact, specification, compatibility statement, certification, or package-content claim.

WRITING STYLE: Human, natural, persuasive, professional, fact-based, benefit-led, easy to scan, concise, trustworthy, mobile-friendly, premium but not exaggerated. Rewrite awkward technical phrasing into clean buyer-friendly language without changing factual meaning.

TONE & CLAIM CONTROL: Do not use vague filler or empty marketing language. Avoid unsupported phrases such as "high quality", "premium quality", "durable", "reliable", "powerful", "efficient", "versatile", "advanced", "perfect for", "ideal for", "long-lasting", "superior performance" — unless the claim is clearly supported by verified facts, materials, certifications, official claims, or obvious product function. No fake urgency, no exaggerated superiority, no ad-style hype.

BENEFIT RULE: Every benefit must be traceable to a verified feature, material, build detail, included function, certification, use case, or product function. No generic benefits.

SEO / AI-ANSWER: Optimize naturally for the primary keyword, secondary keywords, long-tail variations, and the brand/product/category entities. Use keywords naturally; never keyword-stuff. Keep terminology consistent.

FIELD RULES:
- product_title: max 80 characters. Structure: Brand + Product Type/Name + Model + Key Verified Specification/Variant. Readable first, SEO second. No invented specs, no filler words.
- short_summary: max 145 characters. What the product is, who it is for / where it is used, and its strongest verified value point.
- key_benefits: 4-8 bullets, customer-outcome focused, each grounded in a verified feature/use/material/function. Do not merely restate product_features.
- product_features: 6-12 factual bullets, one verified feature each, concise, no benefit fluff.
- description: object with narrative fields (overview, why_useful, key_features_in_use, real_world_applications, who_its_best_for, why_choose). Each is 1-3 natural sentences grounded in verified facts. Leave any field "" if it would require guessing.
- technical_specifications: array of {label, value} — verified specs only (e.g. Brand, Model, Product Type, Color, Material, Dimensions, Weight, Capacity, Voltage, Power, Frequency, Connectivity, Ports, Certifications, Mounting). Omit anything unverified. Do not fabricate values.
- package_contents: only items actually verified from the image/packaging. Otherwise [].
- compatibility: only if explicitly verified. Otherwise [].
- before_you_buy: verified or clearly supportable buyer checks / fit notes / requirements / limitations. Otherwise [].
- how_to_use: 3-6 concise steps only if credibly supported by the product type or verified info. Otherwise [].
- safety_information: 3-6 concise bullets only if credibly appropriate to the verified product category. Otherwise [].
- ai_summary: one concise natural-language paragraph answering what the product is, who it is for, what it does, what problem it solves, and its main verified benefits. Only if the product is identified well enough for high confidence; otherwise "".
- brand: the verified brand only, else "".
- model: the verified model number/name only, else "".
- tags: 8-16 natural SEO keyword phrases (include Kenya-relevant long-tail such as "<product> Kenya", "buy <product> online Kenya" where natural). No keyword stuffing.
- seo_title: max ~60 characters, compelling and accurate.
- seo_description: max ~155 characters meta description.
- identified: true only if you can confidently identify the product type. confidence: "high" | "medium" | "low" based on how much you could verify.

Return ONE JSON object conforming exactly to the provided response schema. No markdown, no commentary, no code fences.`;

// ── base64 helper (chunked to avoid call-stack limits) ──────────────────────
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// ── Gemini response schema ──────────────────────────────────────────────────
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    identified: { type: "BOOLEAN" },
    confidence: { type: "STRING", enum: ["high", "medium", "low"] },
    product_title: { type: "STRING" },
    short_summary: { type: "STRING" },
    brand: { type: "STRING" },
    model: { type: "STRING" },
    key_benefits: { type: "ARRAY", items: { type: "STRING" } },
    product_features: { type: "ARRAY", items: { type: "STRING" } },
    description: {
      type: "OBJECT",
      properties: {
        overview: { type: "STRING" },
        why_useful: { type: "STRING" },
        key_features_in_use: { type: "STRING" },
        real_world_applications: { type: "STRING" },
        who_its_best_for: { type: "STRING" },
        why_choose: { type: "STRING" },
      },
    },
    technical_specifications: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { label: { type: "STRING" }, value: { type: "STRING" } },
        required: ["label", "value"],
      },
    },
    package_contents: { type: "ARRAY", items: { type: "STRING" } },
    compatibility: { type: "ARRAY", items: { type: "STRING" } },
    before_you_buy: { type: "ARRAY", items: { type: "STRING" } },
    how_to_use: { type: "ARRAY", items: { type: "STRING" } },
    safety_information: { type: "ARRAY", items: { type: "STRING" } },
    ai_summary: { type: "STRING" },
    tags: { type: "ARRAY", items: { type: "STRING" } },
    seo_title: { type: "STRING" },
    seo_description: { type: "STRING" },
  },
  required: ["identified", "product_title", "short_summary", "product_features", "tags"],
};

// ── handler ──────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return respond({ error: "GEMINI_API_KEY is not configured" }, 500);
    const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";

    // ── Auth: admin only ────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "Missing authorization" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return respond({ error: "Unauthorized" }, 401);

    const { data: roleRow } = await userClient
      .from("user_roles").select("role")
      .eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return respond({ error: "Admin access required" }, 403);

    // ── Parse image input (multipart file OR JSON image_url) ────────────────
    const ct = req.headers.get("content-type") || "";
    let imageBuffer: Uint8Array;
    let mimeType: string;
    let category = "";
    let brandHint = "";

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("image") as File | null;
      if (!file) return respond({ error: "No image file provided" }, 400);
      mimeType = file.type || "image/jpeg";
      if (!ALLOWED_TYPES.includes(mimeType))
        return respond({ error: `Unsupported type: ${mimeType}` }, 400);
      if (file.size > MAX_FILE_SIZE)
        return respond({ error: "File too large (max 15 MB)" }, 400);
      imageBuffer = new Uint8Array(await file.arrayBuffer());
      category = (form.get("category") as string) || "";
      brandHint = (form.get("brand_hint") as string) || "";
    } else {
      const body = await req.json();
      const imageUrl: string = body.image_url;
      if (!imageUrl) return respond({ error: "No image_url provided" }, 400);
      category = body.category || "";
      brandHint = body.brand_hint || "";

      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok)
        return respond({ error: `Failed to fetch image (${imgRes.status})` }, 400);
      mimeType = (imgRes.headers.get("content-type") || "").split(";")[0].trim() || "image/jpeg";
      if (!mimeType || mimeType === "application/octet-stream") {
        const ext = imageUrl.split("?")[0].split(".").pop()?.toLowerCase() || "";
        mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg";
      }
      if (!ALLOWED_TYPES.includes(mimeType))
        return respond({ error: `Unsupported image type: ${mimeType}` }, 400);
      imageBuffer = new Uint8Array(await imgRes.arrayBuffer());
      if (imageBuffer.length > MAX_FILE_SIZE)
        return respond({ error: "Image from URL too large (max 15 MB)" }, 400);
    }

    // ── Build the buyer/context hint for the model ──────────────────────────
    const hintParts: string[] = [];
    if (category) hintParts.push(`The admin has filed this product under the category: "${category}".`);
    if (brandHint) hintParts.push(`The admin suggests the brand may be: "${brandHint}" — verify against the image and only use it if consistent.`);
    hintParts.push("Note: the image may carry a semi-transparent 'TOOLSMAN' store watermark — ignore it; it is not part of the product and is not printed on the product.");
    const userText = hintParts.join("\n");

    // ── Call Gemini ─────────────────────────────────────────────────────────
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const geminiBody = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType, data: toBase64(imageBuffer) } },
          { text: userText },
        ],
      }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    };

    const aiRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("Gemini error:", aiRes.status, errText);
      return respond({ error: `AI request failed (${aiRes.status})` }, 502);
    }

    const aiJson = await aiRes.json();
    const text = aiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("Gemini returned no text:", JSON.stringify(aiJson).slice(0, 800));
      return respond({ error: "AI returned no content" }, 502);
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      return respond({ error: "AI returned malformed JSON" }, 502);
    }

    return respond({ success: true, data: parsed });
  } catch (err) {
    console.error("generate-product-content fatal:", err);
    return respond({ error: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
});
