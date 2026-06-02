import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting: simple in-memory tracker
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // max requests per window
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
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DIMENSION = 4096;

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

      // Fetch image from URL
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        return new Response(JSON.stringify({ error: "Failed to fetch image from URL" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      mimeType = imgRes.headers.get("content-type") || "image/jpeg";
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
    const storagePath = `products/${timestamp}-${randomId}.${ext}`;

    // Use service role client for storage upload
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch watermark image
    let finalBuffer = imageBuffer;
    let finalMimeType = mimeType;
    try {
      const { data: watermarkData, error: watermarkError } = await serviceClient.storage
        .from("system-assets")
        .download("watermark.png");

      if (!watermarkError && watermarkData) {
        // Import ImageScript dynamically to avoid breaking basic upload if it fails
        const { Image } = await import("https://deno.land/x/imagescript@1.2.15/mod.ts");

        const watermarkBuffer = new Uint8Array(await watermarkData.arrayBuffer());

        // Decode both images
        const mainImage = await Image.decode(imageBuffer);
        const watermarkImage = await Image.decode(watermarkBuffer);

        // Resize watermark to ~10% of main image width (Madukani-style: small + subtle)
        const targetWidth = Math.max(80, Math.floor(mainImage.width * 0.10));
        const scale = targetWidth / watermarkImage.width;
        const targetHeight = Math.floor(watermarkImage.height * scale);
        watermarkImage.resize(targetWidth, targetHeight);

        // Subtle opacity (~25%) so branding is visible but doesn't obstruct product
        watermarkImage.opacity(0.25);

        // Bottom-right corner with small padding (~2% of width)
        const padding = Math.max(12, Math.floor(mainImage.width * 0.02));
        const x = mainImage.width - targetWidth - padding;
        const y = mainImage.height - targetHeight - padding;

        // Composite watermark over main image
        mainImage.composite(watermarkImage, x, y);

        // Re-encode optimized for web. JPEG @ 85 quality keeps files small.
        if (mimeType === "image/png") {
          finalBuffer = await mainImage.encode();
        } else {
          finalBuffer = await mainImage.encodeJPEG(85);
          finalMimeType = "image/jpeg";
        }
      }
    } catch (wmErr) {
      console.warn("Watermarking failed, proceeding with original image:", wmErr);
    }

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

    // Log the action (best-effort - don't fail upload if this table doesn't exist)
    try {
      await serviceClient.from("admin_audit_log").insert({
        admin_id: user.id,
        action: "upload_product_image",
        entity_type: "product_image",
        entity_id: storagePath,
        details: { fileName, mimeType: finalMimeType, size: finalBuffer.length, watermarked: finalBuffer !== imageBuffer },
      });
    } catch (_logErr) {
      // Audit log table may not exist — ignore silently
    }

    const wasWatermarked = finalBuffer !== imageBuffer;

    return new Response(
      JSON.stringify({
        success: true,
        url: urlData.publicUrl,
        path: storagePath,
        size: finalBuffer.length,
        watermarked: wasWatermarked,
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
