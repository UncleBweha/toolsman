import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Safaricom posts here directly (no auth header), so this endpoint must
// stay public (verify_jwt = false). It only ever flips an existing
// mpesa_transactions row from "pending" to a terminal state — it cannot
// create orders or transactions itself.
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Safaricom expects a 200 with this exact ack shape no matter what,
  // otherwise it retries the callback repeatedly.
  const ack = () =>
    new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const payload = await req.json();
    const stkCallback = payload?.Body?.stkCallback;
    if (!stkCallback?.CheckoutRequestID) return ack();

    const resultCode = Number(stkCallback.ResultCode);
    const items: Array<{ Name: string; Value?: unknown }> =
      stkCallback.CallbackMetadata?.Item ?? [];
    const getItem = (name: string) => items.find((i) => i.Name === name)?.Value;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    await admin
      .from("mpesa_transactions")
      .update({
        status: resultCode === 0 ? "success" : "failed",
        result_code: String(stkCallback.ResultCode),
        result_desc: stkCallback.ResultDesc ?? null,
        mpesa_receipt_number: resultCode === 0 ? String(getItem("MpesaReceiptNumber") ?? "") : null,
      })
      .eq("checkout_request_id", stkCallback.CheckoutRequestID)
      .eq("status", "pending");

    return ack();
  } catch (error: any) {
    console.error("Error processing M-Pesa callback:", error?.message ?? error);
    return ack();
  }
};

serve(handler);
