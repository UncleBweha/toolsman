import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DARAJA_BASE = "https://sandbox.safaricom.co.ke";

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

async function getAccessToken(consumerKey: string, consumerSecret: string): Promise<string> {
  const credentials = btoa(`${consumerKey}:${consumerSecret}`);
  const res = await fetch(`${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!res.ok) throw new Error(`Failed to get M-Pesa access token: ${res.status}`);
  const data = await res.json();
  return data.access_token as string;
}

// Polls Safaricom directly, as a fallback for when the async callback is
// slow to arrive (common on the sandbox). Only ever narrows a transaction
// that this user owns, and only while it's still "pending".
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const { checkoutRequestId } = await req.json();
    if (!checkoutRequestId) {
      return new Response(JSON.stringify({ error: "checkoutRequestId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: txn, error: txnErr } = await admin
      .from("mpesa_transactions")
      .select("*")
      .eq("checkout_request_id", checkoutRequestId)
      .eq("user_id", userId)
      .maybeSingle();

    if (txnErr || !txn) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already resolved (e.g. callback already landed) — no need to hit Daraja again
    if (txn.status !== "pending") {
      return new Response(JSON.stringify({
        status: txn.status,
        mpesaReceiptNumber: txn.mpesa_receipt_number,
        resultDesc: txn.result_desc,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
    const shortcode = Deno.env.get("MPESA_SHORTCODE") ?? "174379";
    const passkey = Deno.env.get("MPESA_PASSKEY");
    if (!consumerKey || !consumerSecret || !passkey) throw new Error("M-Pesa credentials not configured");

    const accessToken = await getAccessToken(consumerKey, consumerSecret);
    const ts = timestamp();
    const password = btoa(`${shortcode}${passkey}${ts}`);

    const queryRes = await fetch(`${DARAJA_BASE}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: ts,
        CheckoutRequestID: checkoutRequestId,
      }),
    });
    const queryData = await queryRes.json();

    // Still being processed on the phone — errorCode 500.001.1001, not a real error
    if (!queryRes.ok || queryData.errorCode) {
      return new Response(JSON.stringify({ status: "pending" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resultCode = Number(queryData.ResultCode);
    if (Number.isNaN(resultCode)) {
      return new Response(JSON.stringify({ status: "pending" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newStatus = resultCode === 0 ? "success" : "failed";
    await admin
      .from("mpesa_transactions")
      .update({
        status: newStatus,
        result_code: String(queryData.ResultCode),
        result_desc: queryData.ResultDesc ?? null,
      })
      .eq("checkout_request_id", checkoutRequestId)
      .eq("status", "pending");

    return new Response(JSON.stringify({
      status: newStatus,
      resultDesc: queryData.ResultDesc,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error querying STK push status:", error?.message ?? error);
    return new Response(JSON.stringify({ error: "Failed to check payment status" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
