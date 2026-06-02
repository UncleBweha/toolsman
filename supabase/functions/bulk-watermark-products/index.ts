// bulk-watermark-products — Supabase Edge Function
// Scans the product catalogue in keyset-paginated batches and applies the
// watermark to every image that has not yet been processed.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── shared watermark logic ───────────────────────────────────────────────────
async function applyWatermark(
  imageBuffer: Uint8Array,
  mimeType: string,
  watermarkBuffer: Uint8Array,
  fontBuffer: Uint8Array | null,
): Promise<{ buffer: Uint8Array; mime: string; applied: boolean }> {
  const { Image } = await import("https://deno.land/x/imagescript@1.2.15/mod.ts");

  let main: InstanceType<typeof Image>;
  try {
    main = await Image.decode(imageBuffer);
  } catch {
    // Cannot decode — likely WebP or corrupt file
    return { buffer: imageBuffer, mime: mimeType, applied: false };
  }

  let applied = false;

  // ── 1. Logo watermark (watermark.png) ────────────────────────────────────
  if (watermarkBuffer.length > 0) {
    try {
      const wm = await Image.decode(watermarkBuffer);

      // 35 % of image width, min 120 px
      const targetW = Math.max(120, Math.floor(main.width * 0.35));
      const scale   = targetW / wm.width;
      const targetH = Math.max(20, Math.floor(wm.height * scale));
      wm.resize(targetW, targetH);
      wm.opacity(0.30); // 30 % — subtle but clearly visible

      // Center horizontally, 60 % down vertically
      const x = Math.floor((main.width  - targetW) / 2);
      const y = Math.floor( main.height * 0.60 - targetH / 2);

      main.composite(wm, x, y);
      applied = true;
    } catch (e) {
      console.warn("Logo watermark failed:", e);
    }
  }

  // ── 2. Text fallback — Cinzel "TOOLSMAN" ─────────────────────────────────
  if (!applied && fontBuffer) {
    try {
      const fontSize  = Math.min(110, Math.max(22, Math.floor(main.width * 0.065)));
      const shadowImg = await Image.renderText(fontBuffer, fontSize, "TOOLSMAN", 0x00000055);
      const goldImg   = await Image.renderText(fontBuffer, fontSize, "TOOLSMAN", 0xd4c3a3cc);

      const x      = Math.floor((main.width  - goldImg.width) / 2);
      const y      = Math.floor( main.height * 0.60 - goldImg.height / 2);
      const offset = Math.max(1, Math.floor(fontSize * 0.04));

      main.composite(shadowImg, x + offset, y + offset);
      main.composite(goldImg,   x,          y);
      applied = true;
    } catch (e) {
      console.warn("Text watermark failed:", e);
    }
  }

  if (!applied) {
    return { buffer: imageBuffer, mime: mimeType, applied: false };
  }

  if (mimeType === "image/png") {
    return { buffer: await main.encode(), mime: "image/png", applied: true };
  }
  return { buffer: await main.encodeJPEG(85), mime: "image/jpeg", applied: true };
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

    // ── Load watermark assets ─────────────────────────────────────────────
    let watermarkBuffer: Uint8Array = new Uint8Array(0);
    let fontBuffer: Uint8Array | null = null;

    const { data: wmBlob, error: wmErr } = await service.storage
      .from("system-assets").download("watermark.png");
    if (!wmErr && wmBlob) {
      watermarkBuffer = new Uint8Array(await wmBlob.arrayBuffer());
      console.log("watermark.png loaded:", watermarkBuffer.length, "bytes");
    } else {
      console.warn("watermark.png missing — checking for font fallback");
      const { data: fontBlob, error: fontErr } = await service.storage
        .from("system-assets").download("cinzel-font.ttf");
      if (!fontErr && fontBlob) {
        fontBuffer = new Uint8Array(await fontBlob.arrayBuffer());
        console.log("cinzel-font.ttf loaded:", fontBuffer.length, "bytes");
      }
    }

    if (watermarkBuffer.length === 0 && !fontBuffer) {
      return respond({
        error: "No watermark assets found. Upload watermark.png (or cinzel-font.ttf) in Watermark Settings first.",
      }, 400);
    }

    // ── Parse request params ──────────────────────────────────────────────
    const body   = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const limit  = Math.min(Math.max(Number(body.limit)  || 50,  1), 200);
    const force  = !!body.force;
    const lastId = String(body.last_id || "");

    // ── Query products ────────────────────────────────────────────────────
    let query = service
      .from("products")
      .select("id, image_url")
      .not("image_url", "is", null)
      .order("id", { ascending: true });

    if (lastId) query = query.gt("id", lastId);
    if (!force) query = query.not("image_url", "like", "%/products/wm-%");
    query = query.limit(limit);

    const { data: products, error: pErr } = await query;
    if (pErr) return respond({ error: pErr.message }, 500);

    let processed = 0, skipped = 0, failed = 0;
    const errors: Array<{ id: string; error: string }> = [];
    let lastIdProcessed = lastId;

    for (const p of (products || [])) {
      lastIdProcessed = p.id;

      try {
        let url = String(p.image_url);

        // Skip already-watermarked (unless force)
        if (!force && url.includes("/products/wm-")) {
          skipped++;
          continue;
        }

        // Resolve relative URLs
        if (!url.startsWith("http")) {
          const base = Deno.env.get("SUPABASE_URL")!;
          url = url.startsWith("/")
            ? `${base}${url}`
            : `${base}/storage/v1/object/public/product-images/${url}`;
        }

        // Fetch image
        const res = await fetch(url);
        if (!res.ok) {
          failed++;
          errors.push({ id: p.id, error: `HTTP ${res.status} fetching ${url}` });
          continue;
        }
        const buf = new Uint8Array(await res.arrayBuffer());

        // Determine MIME
        let mime = (res.headers.get("content-type") || "").split(";")[0].trim();
        if (!mime || mime === "application/octet-stream") {
          const ext = url.split("?")[0].split(".").pop()?.toLowerCase() || "";
          mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
        }

        // Apply watermark
        const { buffer: out, mime: outMime, applied } = await applyWatermark(
          buf, mime, watermarkBuffer, fontBuffer,
        );

        if (!applied) {
          skipped++;
          console.log(`Skipped ${p.id} — could not decode (possibly WebP)`);
          continue;
        }

        // Upload watermarked file
        const ext  = outMime === "image/png" ? "png" : "jpg";
        const path = `products/wm-${Date.now()}-${p.id.slice(0, 8)}.${ext}`;
        const { error: upErr } = await service.storage
          .from("product-images")
          .upload(path, out, { contentType: outMime, upsert: false });

        if (upErr) {
          failed++;
          errors.push({ id: p.id, error: `upload: ${upErr.message}` });
          continue;
        }

        const { data: pub } = service.storage.from("product-images").getPublicUrl(path);
        const { error: updErr } = await service
          .from("products").update({ image_url: pub.publicUrl }).eq("id", p.id);

        if (updErr) {
          failed++;
          errors.push({ id: p.id, error: `db update: ${updErr.message}` });
          continue;
        }

        processed++;
      } catch (e) {
        failed++;
        errors.push({ id: p.id, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return respond({
      success: true,
      processed,
      skipped,
      failed,
      returned: products?.length || 0,
      last_id:  lastIdProcessed,
      errors,
    });

  } catch (e) {
    console.error("bulk-watermark-products fatal:", e);
    return respond({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});
