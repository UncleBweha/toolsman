import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpDecode, { init as initWebpDecode } from "https://esm.sh/@jsquash/webp@1.2.0/decode";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function applyWatermark(
  Image: any,
  imageBuffer: Uint8Array,
  mimeType: string,
  watermarkBuffer: Uint8Array | null
): Promise<{ buffer: Uint8Array; mimeType: string; watermarked: boolean }> {
  try {
    let mainImage: any;
    
    // Decode image (handle WebP specifically using @jsquash/webp)
    if (mimeType === "image/webp" || mimeType.includes("webp")) {
      try {
        const wasmRes = await fetch("https://unpkg.com/@jsquash/webp@1.2.0/codec/dec/webp_dec.wasm");
        if (!wasmRes.ok) throw new Error("Failed to fetch WebP Wasm");
        const wasmBuf = await wasmRes.arrayBuffer();
        await initWebpDecode(wasmBuf);
        
        const decoded = await webpDecode(imageBuffer);
        mainImage = new Image(decoded.width, decoded.height);
        mainImage.bitmap.set(new Uint8Array(decoded.data.buffer));
      } catch (webpErr) {
        console.warn("WebP decoding failed, falling back to ImageScript:", webpErr);
        mainImage = await Image.decode(imageBuffer);
      }
    } else {
      mainImage = await Image.decode(imageBuffer);
    }

    if (!mainImage) {
      throw new Error("Failed to decode product image");
    }

    let watermarked = false;

    // 1. Try custom logo watermark first
    if (watermarkBuffer) {
      try {
        const wmImg = await Image.decode(watermarkBuffer);
        // Scale to 35% of main image width (centered, elegant, gold-style)
        const targetWidth = Math.max(150, Math.floor(mainImage.width * 0.35));
        const scale = targetWidth / wmImg.width;
        const targetHeight = Math.max(30, Math.floor(wmImg.height * scale));
        wmImg.resize(targetWidth, targetHeight);
        
        // Center horizontally, lower-middle section (60% down)
        const x = Math.floor((mainImage.width - targetWidth) / 2);
        const y = Math.floor(mainImage.height * 0.60 - targetHeight / 2);
        
        wmImg.opacity(0.30); // Subtle opacity to keep details visible but watermark readable
        mainImage.composite(wmImg, x, y);
        watermarked = true;
      } catch (logoErr) {
        console.warn("Uploaded watermark.png decoding failed, falling back to text:", logoErr);
      }
    }

    // 2. Fallback to elegant gold serif text "TOOLSMAN" if logo failed or not provided
    if (!watermarked) {
      try {
        const fontRes = await fetch("https://raw.githubusercontent.com/google/fonts/main/ofl/cinzel/Cinzel-Medium.ttf");
        if (!fontRes.ok) throw new Error("Font fetch failed");
        const fontData = new Uint8Array(await fontRes.arrayBuffer());
        
        const fontSize = Math.min(120, Math.max(24, Math.floor(mainImage.width * 0.065)));
        
        const shadowImg = await Image.renderText(fontData, fontSize, "TOOLSMAN", 0x00000055); // 33% black shadow
        const goldImg = await Image.renderText(fontData, fontSize, "TOOLSMAN", 0xd4c3a3cc); // 80% gold/beige (#d4c3a3)
        
        const x = Math.floor((mainImage.width - goldImg.width) / 2);
        const y = Math.floor(mainImage.height * 0.60 - goldImg.height / 2);
        
        const offset = Math.max(1, Math.floor(fontSize * 0.04));
        mainImage.composite(shadowImg, x + offset, y + offset);
        mainImage.composite(goldImg, x, y);
        watermarked = true;
      } catch (textErr) {
        console.warn("Text watermarking failed, skipping watermark:", textErr);
      }
    }

    // Re-encode image (optimize WebP/PNG/JPEG)
    let finalBuffer = imageBuffer;
    let finalMimeType = mimeType;
    
    if (watermarked) {
      if (mimeType === "image/png") {
        finalBuffer = await mainImage.encode();
      } else {
        // Default to JPEG @ 85 quality to keep size small
        finalBuffer = await mainImage.encodeJPEG(85);
        finalMimeType = "image/jpeg";
      }
    }
    
    return { buffer: finalBuffer, mimeType: finalMimeType, watermarked };
  } catch (err) {
    console.error("Watermark processing failed, keeping original:", err);
    return { buffer: imageBuffer, mimeType, watermarked: false };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: role } = await userClient
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Admin access required" }, 403);

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch watermark
    let watermarkBuffer: Uint8Array | null = null;
    const { data: wm, error: wmDlError } = await service.storage
      .from("system-assets")
      .download("watermark.png");

    if (!wmDlError && wm) {
      watermarkBuffer = new Uint8Array(await wm.arrayBuffer());
    }

    const { Image } = await import("https://deno.land/x/imagescript@1.2.15/mod.ts");

    // Body: { limit?: number, force?: boolean, last_id?: string }
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 200);
    const force = !!body.force;
    const lastId = body.last_id || "";

    // Find products with image_url
    let query = service
      .from("products")
      .select("id, image_url")
      .not("image_url", "is", null)
      .order("id", { ascending: true });

    if (lastId) {
      query = query.gt("id", lastId);
    }

    if (!force) {
      query = query.not("image_url", "like", "%/products/wm-%");
    }

    query = query.limit(limit);

    const { data: products, error: pErr } = await query;
    if (pErr) return json({ error: pErr.message }, 500);

    let processed = 0, skipped = 0, failed = 0;
    const errors: Array<{ id: string; error: string }> = [];
    let lastIdProcessed = lastId;

    for (const p of (products || [])) {
      lastIdProcessed = p.id;
      try {
        let url = p.image_url as string;
        if (!force && url.includes("/products/wm-")) {
          skipped++;
          continue;
        }

        // Handle relative URLs
        if (!url.startsWith("http")) {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          if (url.startsWith("/")) {
            url = `${supabaseUrl}${url}`;
          } else {
            url = `${supabaseUrl}/storage/v1/object/public/product-images/${url}`;
          }
        }

        const res = await fetch(url);
        if (!res.ok) {
          failed++;
          errors.push({ id: p.id, error: `fetch failed status ${res.status} for URL ${url}` });
          continue;
        }
        const buf = new Uint8Array(await res.arrayBuffer());

        let mimeType = res.headers.get("content-type") || "image/jpeg";
        if (mimeType === "application/octet-stream" || !mimeType) {
          if (url.endsWith(".png")) mimeType = "image/png";
          else if (url.endsWith(".webp")) mimeType = "image/webp";
          else mimeType = "image/jpeg";
        }

        const { buffer: finalBuffer, mimeType: finalMimeType, watermarked } = await applyWatermark(
          Image,
          buf,
          mimeType,
          watermarkBuffer
        );

        if (!watermarked) {
          skipped++;
          continue;
        }

        const ext = url.split(".").pop()?.split("?")[0] || "jpg";
        const path = `products/wm-${Date.now()}-${p.id.slice(0, 8)}.${ext}`;
        const { error: upErr } = await service.storage
          .from("product-images")
          .upload(path, finalBuffer, { contentType: finalMimeType, upsert: false });
          
        if (upErr) {
          failed++;
          errors.push({ id: p.id, error: `upload failed: ${upErr.message}` });
          continue;
        }

        const { data: pub } = service.storage.from("product-images").getPublicUrl(path);
        const { error: updErr } = await service.from("products").update({ image_url: pub.publicUrl }).eq("id", p.id);
        if (updErr) {
          failed++;
          errors.push({ id: p.id, error: `db update failed: ${updErr.message}` });
          continue;
        }
        processed++;
      } catch (e) {
        failed++;
        errors.push({ id: p.id, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return json({
      success: true,
      processed,
      skipped,
      failed,
      returned: products?.length || 0,
      last_id: lastIdProcessed,
      errors
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
