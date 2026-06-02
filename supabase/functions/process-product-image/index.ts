import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpDecode, { init as initWebpDecode } from "https://esm.sh/@jsquash/webp@1.2.0/decode";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting: simple in-memory tracker (increased significantly to avoid blocking bulk imports)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 1000; // max requests per window
const RATE_WINDOW_MS = 60_000; // 1 minute

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// Allowed MIME types and max size
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit check
    if (!checkRateLimit(user.id)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request
    const contentType = req.headers.get("content-type") || "";
    let imageBuffer: Uint8Array;
    let fileName: string;
    let mimeType: string;

    if (contentType.includes("multipart/form-data")) {
      // File upload
      const formData = await req.formData();
      const file = formData.get("image") as File;
      if (!file) {
        return new Response(JSON.stringify({ error: "No image file provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return new Response(JSON.stringify({ error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(", ")}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return new Response(JSON.stringify({ error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      imageBuffer = new Uint8Array(await file.arrayBuffer());
      fileName = file.name;
      mimeType = file.type;
    } else {
      // JSON body with image URL
      const body = await req.json();
      const imageUrl = body.image_url;
      if (!imageUrl) {
        return new Response(JSON.stringify({ error: "No image_url provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If already watermarked, return immediately
      if (imageUrl.includes("/products/wm-")) {
        return new Response(
          JSON.stringify({
            success: true,
            url: imageUrl,
            watermarked: false,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Fetch image from URL
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        return new Response(JSON.stringify({ error: `Failed to fetch image from URL: ${imageUrl}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      mimeType = imgRes.headers.get("content-type") || "image/jpeg";
      // Allow fallback if mimetype detection fails
      if (mimeType === "application/octet-stream" || !mimeType) {
        if (imageUrl.endsWith(".png")) mimeType = "image/png";
        else if (imageUrl.endsWith(".webp")) mimeType = "image/webp";
        else mimeType = "image/jpeg";
      }

      if (!ALLOWED_TYPES.includes(mimeType)) {
        return new Response(JSON.stringify({ error: `Invalid image type from URL: ${mimeType}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      imageBuffer = new Uint8Array(await imgRes.arrayBuffer());
      if (imageBuffer.length > MAX_FILE_SIZE) {
        return new Response(JSON.stringify({ error: "Image from URL is too large" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const urlParts = imageUrl.split("/");
      fileName = urlParts[urlParts.length - 1]?.split("?")[0] || "image.jpg";
    }

    // Generate unique file path
    const ext = fileName.split(".").pop() || "jpg";
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().slice(0, 8);
    const storagePath = `products/wm-${timestamp}-${randomId}.${ext}`;

    // Use service role client for storage upload
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch custom watermark image if present
    let watermarkBuffer: Uint8Array | null = null;
    const { data: watermarkData, error: watermarkError } = await serviceClient.storage
      .from("system-assets")
      .download("watermark.png");

    if (!watermarkError && watermarkData) {
      watermarkBuffer = new Uint8Array(await watermarkData.arrayBuffer());
    }

    // Import ImageScript dynamically
    const { Image } = await import("https://deno.land/x/imagescript@1.2.15/mod.ts");

    // Apply watermark logic
    const { buffer: finalBuffer, mimeType: finalMimeType, watermarked } = await applyWatermark(
      Image,
      imageBuffer,
      mimeType,
      watermarkBuffer
    );

    // Upload to storage
    const { error: uploadError } = await serviceClient.storage
      .from("product-images")
      .upload(storagePath, finalBuffer, {
        contentType: finalMimeType,
        upsert: false,
      });

    if (uploadError) {
      return new Response(JSON.stringify({ error: "Failed to upload image: " + uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get public URL
    const { data: urlData } = serviceClient.storage
      .from("product-images")
      .getPublicUrl(storagePath);

    // Log the action
    try {
      await serviceClient.from("admin_audit_log").insert({
        admin_id: user.id,
        action: "upload_product_image",
        entity_type: "product_image",
        entity_id: storagePath,
        details: { fileName, mimeType: finalMimeType, size: finalBuffer.length, watermarked },
      });
    } catch (_logErr) {
      // Audit log table may not exist — ignore silently
    }

    return new Response(
      JSON.stringify({
        success: true,
        url: urlData.publicUrl,
        path: storagePath,
        size: finalBuffer.length,
        watermarked,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("process-product-image error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
