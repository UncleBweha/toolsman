import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;
    const email = claimsData.claims.email as string;

    const body = await req.json().catch(() => ({}));
    const password: string | undefined = body?.password;
    if (!password || typeof password !== "string") {
      return new Response(JSON.stringify({ error: "Password required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Re-authenticate to confirm identity
    const verifyClient = createClient(SUPABASE_URL, ANON_KEY);
    const { error: signInErr } = await verifyClient.auth.signInWithPassword({ email, password });
    if (signInErr) {
      return new Response(JSON.stringify({ error: "Invalid password" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Cascade clean-up
    await admin.from("cart_items").delete().eq("user_id", userId);
    await admin.from("wishlists").delete().eq("user_id", userId);
    await admin.from("user_roles").delete().eq("user_id", userId);
    await admin.from("profiles").delete().eq("id", userId);
    // Anonymise orders so accounting history stays consistent
    await admin.from("orders").update({ user_id: null }).eq("user_id", userId);

    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) throw delErr;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
