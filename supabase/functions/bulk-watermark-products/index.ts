// Re-watermarks existing product images in bulk. Admin-only.
// For each product that hasn't been watermarked yet, downloads the existing
// image, composites the watermark in the bottom-right at ~10% width / 25% opacity,
// uploads as a new file, and updates the product row.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { data: wm } = await service.storage.from("system-assets").download("watermark.png");
    if (!wm) return json({ error: "Upload a watermark.png in Watermark Settings first." }, 400);
    const watermarkBuffer = new Uint8Array(await wm.arrayBuffer());

    const { Image } = await import("https://deno.land/x/imagescript@1.2.15/mod.ts");

    // Body: { limit?: number, force?: boolean }
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 200);
    const force = !!body.force;

    // Find products with image_url. We mark watermarked images by storing them at
    // `products/wm-*` path; if force=true we re-process everything.
    let query = service.from("products").select("id, image_url").not("image_url", "is", null).limit(limit);
    const { data: products, error: pErr } = await query;
    if (pErr) return json({ error: pErr.message }, 500);

    let processed = 0, skipped = 0, failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const p of (products || [])) {
      try {
        const url = p.image_url as string;
        if (!force && url.includes("/products/wm-")) { skipped++; continue; }

        const res = await fetch(url);
        if (!res.ok) { failed++; errors.push({ id: p.id, error: `fetch ${res.status}` }); continue; }
        const buf = new Uint8Array(await res.arrayBuffer());

        const main = await Image.decode(buf);
        const wmImg = await Image.decode(watermarkBuffer);
        const tw = Math.max(80, Math.floor(main.width * 0.10));
        const scale = tw / wmImg.width;
        const th = Math.floor(wmImg.height * scale);
        wmImg.resize(tw, th);
        wmImg.opacity(0.25);
        const pad = Math.max(12, Math.floor(main.width * 0.02));
        main.composite(wmImg, main.width - tw - pad, main.height - th - pad);
        const out = await main.encodeJPEG(85);

        const path = `products/wm-${Date.now()}-${p.id.slice(0, 8)}.jpg`;
        const { error: upErr } = await service.storage
          .from("product-images")
          .upload(path, out, { contentType: "image/jpeg", upsert: false });
        if (upErr) { failed++; errors.push({ id: p.id, error: upErr.message }); continue; }

        const { data: pub } = service.storage.from("product-images").getPublicUrl(path);
        const { error: updErr } = await service.from("products").update({ image_url: pub.publicUrl }).eq("id", p.id);
        if (updErr) { failed++; errors.push({ id: p.id, error: updErr.message }); continue; }
        processed++;
      } catch (e) {
        failed++;
        errors.push({ id: p.id, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return json({ success: true, processed, skipped, failed, total: products?.length || 0, errors });
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
