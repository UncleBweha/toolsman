import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface OrderNotificationRequest {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  itemsCount: number;
  shippingAddress: {
    address: string;
    city: string;
    phone: string;
  };
}

async function sendWhatsApp(to: string, message: string): Promise<any> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioWhatsAppNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER") || "whatsapp:+14155238886";

  if (!accountSid || !authToken) {
    return { error: "Twilio credentials not configured" };
  }

  try {
    const whatsappTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
    const whatsappFrom = twilioWhatsAppNumber.startsWith("whatsapp:")
      ? twilioWhatsAppNumber
      : `whatsapp:${twilioWhatsAppNumber}`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: whatsappTo, From: whatsappFrom, Body: message }),
    });
    return await response.json();
  } catch (error) {
    console.error("Twilio WhatsApp error:", error);
    return { error: String(error) };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authenticated user (must match the user who owns the order)
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

    const body: OrderNotificationRequest = await req.json();
    const {
      orderNumber,
      customerName,
      customerEmail,
      totalAmount,
      itemsCount,
      shippingAddress,
    } = body ?? ({} as OrderNotificationRequest);

    if (!orderNumber || !customerEmail || !shippingAddress) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the order exists and belongs to this user using a privileged client
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, order_number, user_id, total")
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (orderErr || !order || order.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminEmail = "toolsmanstore@gmail.com";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

    const safe = {
      orderNumber: esc(orderNumber),
      customerName: esc(customerName),
      customerEmail: esc(customerEmail),
      itemsCount: esc(itemsCount),
      total: esc(Number(totalAmount || 0).toLocaleString()),
      address: esc(shippingAddress.address),
      city: esc(shippingAddress.city),
      phone: esc(shippingAddress.phone),
    };

    const adminEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Toolsman <onboarding@resend.dev>",
        to: [adminEmail],
        subject: `New Order Received - ${String(orderNumber).slice(0, 40)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 10px;">🛒 New Order Received!</h1>
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #333;">Order Details</h2>
              <p><strong>Order Number:</strong> ${safe.orderNumber}</p>
              <p><strong>Items:</strong> ${safe.itemsCount} item(s)</p>
              <p><strong>Total Amount:</strong> KSh ${safe.total}</p>
            </div>
            <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #333;">Customer Information</h2>
              <p><strong>Name:</strong> ${safe.customerName}</p>
              <p><strong>Email:</strong> ${safe.customerEmail}</p>
              <p><strong>Phone:</strong> ${safe.phone}</p>
            </div>
            <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #333;">Shipping Address</h2>
              <p>${safe.address}</p>
              <p>${safe.city}</p>
            </div>
          </div>
        `,
      }),
    });
    const adminResult = await adminEmailResponse.json();

    const customerEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Toolsman <onboarding@resend.dev>",
        to: [customerEmail],
        subject: `Order Confirmed - ${String(orderNumber).slice(0, 40)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 10px;">✅ Thank You for Your Order!</h1>
            <p style="font-size: 16px; color: #333;">Hi ${safe.customerName},</p>
            <p style="font-size: 16px; color: #333;">Thank you for shopping with Toolsman! Your order has been received and is being processed.</p>
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #333;">Order Summary</h2>
              <p><strong>Order Number:</strong> ${safe.orderNumber}</p>
              <p><strong>Items:</strong> ${safe.itemsCount} item(s)</p>
              <p><strong>Total Amount:</strong> KSh ${safe.total}</p>
              <p><strong>Payment Method:</strong> Pay on Delivery</p>
            </div>
            <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #333;">Delivery Address</h2>
              <p>${safe.address}</p>
              <p>${safe.city}</p>
              <p><strong>Phone:</strong> ${safe.phone}</p>
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">Thank you for choosing Toolsman!<br><strong>The Toolsman Team</strong></p>
          </div>
        `,
      }),
    });
    const customerResult = await customerEmailResponse.json();

    // WhatsApp uses plain text (not HTML), but still pass through validated fields
    const adminPhone = "+254742433416";
    const adminWhatsAppMessage = `🛒 *New Order Received!*\n\n📦 Order: ${orderNumber}\n👤 Customer: ${customerName}\n💰 Amount: KSh ${Number(totalAmount || 0).toLocaleString()}\n🛍️ Items: ${itemsCount}\n📞 Phone: ${shippingAddress.phone}\n📍 Address: ${shippingAddress.address}, ${shippingAddress.city}`;
    const adminWhatsAppResult = await sendWhatsApp(adminPhone, adminWhatsAppMessage);

    const rawPhone = String(shippingAddress.phone || "");
    const customerPhone = rawPhone.startsWith("+")
      ? rawPhone
      : `+254${rawPhone.replace(/^0/, "")}`;
    const customerWhatsAppMessage = `✅ *Thank you for your order at Toolsman!*\n\n📦 Order: ${orderNumber}\n💰 Total: KSh ${Number(totalAmount || 0).toLocaleString()}\n\n📞 We'll contact you shortly to confirm delivery.\n\nThank you for shopping with us! 🙏`;
    const customerWhatsAppResult = await sendWhatsApp(customerPhone, customerWhatsAppMessage);

    return new Response(JSON.stringify({
      success: true,
      adminResult,
      customerResult,
      adminWhatsAppResult,
      customerWhatsAppResult,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending order notification:", error?.message ?? error);
    return new Response(
      JSON.stringify({ error: "Failed to send notification" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
