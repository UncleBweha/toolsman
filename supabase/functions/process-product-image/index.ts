// process-product-image — Supabase Edge Function
// Accepts a file upload (multipart) or an image URL (JSON) and returns a
// watermarked version stored in the product-images bucket.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

// ── watermark compositor ─────────────────────────────────────────────────────
async function applyWatermark(
  imageBuffer: Uint8Array,
  mimeType: string,
  watermarkBuffer: Uint8Array,
  fontBuffer: Uint8Array | null,
): Promise<{ buffer: Uint8Array; mime: string }> {
  // Dynamic import — only ImageScript, proven Deno-compatible
  const { Image } = await import("https://deno.land/x/imagescript@1.2.15/mod.ts");

  // Decode main image — WebP will throw; we catch it below
  let main: InstanceType<typeof Image>;
  try {
    main = await Image.decode(imageBuffer);
  } catch {
    // ImageScript cannot decode WebP natively — return original
    console.warn("Cannot decode image (may be WebP), returning original");
    return { buffer: imageBuffer, mime: mimeType };
  }

  // ── 1. Try logo watermark (watermark.png from storage) ────────────────────
  try {
    const wm = await Image.decode(watermarkBuffer);

    // Scale logo to 35 % of image width (min 120 px)
    const targetW = Math.max(120, Math.floor(main.width * 0.35));
    const scale   = targetW / wm.width;
    const targetH = Math.max(20, Math.floor(wm.height * scale));
    wm.resize(targetW, targetH);

    // 55 % opacity — subtle but visible
    wm.opacity(0.55);

    // Center horizontally, 60 % of the way down
    const x = Math.floor((main.width  - targetW) / 2);
    const y = Math.floor( main.height * 0.60 - targetH / 2);

    main.composite(wm, x, y);
    console.log(`Logo watermark applied at (${x}, ${y}), size ${targetW}×${targetH}`);
  } catch (logoErr) {
    console.warn("Logo watermark failed:", logoErr);

    // ── 2. Fallback — elegant text "TOOLSMAN" with Cinzel font ──────────────
    if (fontBuffer) {
      try {
        const fontSize = Math.min(110, Math.max(22, Math.floor(main.width * 0.065)));

        // Dark drop-shadow layer (offset 2 % of font size, ~50 % opacity)
        const shadowImg = await Image.renderText(fontBuffer, fontSize, "TOOLSMAN", 0x00000080);
        // Gold/beige layer (#d4c3a3 at ~93 % opacity = EE)
        const goldImg   = await Image.renderText(fontBuffer, fontSize, "TOOLSMAN", 0xd4c3a3ee);

        const x      = Math.floor((main.width  - goldImg.width) / 2);
        const y      = Math.floor( main.height * 0.60 - goldImg.height / 2);
        const offset = Math.max(1, Math.floor(fontSize * 0.04));

        main.composite(shadowImg, x + offset, y + offset);
        main.composite(goldImg,   x,          y);
        console.log(`Text watermark applied at (${x}, ${y}), fontSize ${fontSize}`);
      } catch (textErr) {
        console.warn("Text watermark also failed — saving without watermark:", textErr);
      }
    } else {
      console.warn("No font available for text watermark — saving without watermark");
    }
  }

  // Re-encode: PNG stays PNG, everything else → JPEG 85 %
  if (mimeType === "image/png") {
    return { buffer: await main.encode(), mime: "image/png" };
  }
  return { buffer: await main.encodeJPEG(85), mime: "image/jpeg" };
}

// ── handler ──────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Auth
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

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Parse image input ──────────────────────────────────────────────────
    const ct = req.headers.get("content-type") || "";
    let imageBuffer: Uint8Array;
    let fileName: string;
    let mimeType: string;

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
      fileName    = file.name;
    } else {
      const body = await req.json();
      const imageUrl: string = body.image_url;
      if (!imageUrl) return respond({ error: "No image_url provided" }, 400);

      // Already watermarked — skip
      if (imageUrl.includes("/products/wm-"))
        return respond({ success: true, url: imageUrl, watermarked: false });

      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok)
        return respond({ error: `Failed to fetch image (${imgRes.status})` }, 400);

      mimeType = (imgRes.headers.get("content-type") || "").split(";")[0].trim() || "image/jpeg";
      // Guess from URL extension when server returns generic type
      if (!mimeType || mimeType === "application/octet-stream") {
        const ext = imageUrl.split("?")[0].split(".").pop()?.toLowerCase() || "";
        mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      }
      if (!ALLOWED_TYPES.includes(mimeType))
        return respond({ error: `Unsupported image type: ${mimeType}` }, 400);

      imageBuffer = new Uint8Array(await imgRes.arrayBuffer());
      if (imageBuffer.length > MAX_FILE_SIZE)
        return respond({ error: "Image from URL too large (max 15 MB)" }, 400);

      const parts = imageUrl.split("?")[0].split("/");
      fileName = parts[parts.length - 1] || "image.jpg";
    }

    // ── Fetch watermark assets from storage ───────────────────────────────
    let watermarkBuffer: Uint8Array = new Uint8Array(0);
    let fontBuffer: Uint8Array | null = null;

    const { data: wmBlob, error: wmErr } = await service.storage
      .from("system-assets").download("watermark.png");
    if (!wmErr && wmBlob) {
      watermarkBuffer = new Uint8Array(await wmBlob.arrayBuffer());
      console.log("watermark.png loaded, size:", watermarkBuffer.length);
    } else {
      console.warn("watermark.png not found — will try text watermark");
      // Try loading Cinzel font stored in system-assets
      const { data: fontBlob, error: fontErr } = await service.storage
        .from("system-assets").download("cinzel-font.ttf");
      if (!fontErr && fontBlob) {
        fontBuffer = new Uint8Array(await fontBlob.arrayBuffer());
        console.log("cinzel-font.ttf loaded, size:", fontBuffer.length);
      }
    }

    if (watermarkBuffer.length === 0 && !fontBuffer) {
      console.warn("No watermark assets available — uploading original image");
    }

    // ── Apply watermark ────────────────────────────────────────────────────
    const { buffer: finalBuffer, mime: finalMime } = watermarkBuffer.length > 0 || fontBuffer
      ? await applyWatermark(imageBuffer, mimeType, watermarkBuffer, fontBuffer)
      : { buffer: imageBuffer, mime: mimeType };

    const watermarked = finalBuffer !== imageBuffer;

    // ── Upload to storage ──────────────────────────────────────────────────
    const ext       = finalMime === "image/png" ? "png" : "jpg";
    const path      = `products/wm-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const { error: upErr } = await service.storage
      .from("product-images")
      .upload(path, finalBuffer, { contentType: finalMime, upsert: false });

    if (upErr) return respond({ error: "Upload failed: " + upErr.message }, 500);

    const { data: urlData } = service.storage.from("product-images").getPublicUrl(path);

    // Audit log (best-effort)
    try {
      await service.from("admin_audit_log").insert({
        admin_id:    user.id,
        action:      "upload_product_image",
        entity_type: "product_image",
        entity_id:   path,
        details:     { fileName, mimeType: finalMime, size: finalBuffer.length, watermarked },
      });
    } catch { /* table may not exist */ }

    return respond({ success: true, url: urlData.publicUrl, path, size: finalBuffer.length, watermarked });

  } catch (err) {
    console.error("process-product-image fatal:", err);
    return respond({ error: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
});
