import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

// Helper function to send WhatsApp message via Twilio
async function sendWhatsApp(to: string, message: string): Promise<any> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioWhatsAppNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER") || "whatsapp:+14155238886"; // Twilio Sandbox default

  console.log("=== TWILIO WHATSAPP DEBUG ===");
  console.log("Account SID exists:", !!accountSid);
  console.log("Auth Token exists:", !!authToken);
  console.log("WhatsApp Number:", twilioWhatsAppNumber);
  console.log("Sending to:", to);

  if (!accountSid || !authToken) {
    console.log("Twilio credentials not configured, skipping WhatsApp");
    return { error: "Twilio credentials not configured" };
  }

  try {
    // Format the recipient number for WhatsApp
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
      body: new URLSearchParams({
        To: whatsappTo,
        From: whatsappFrom,
        Body: message,
      }),
    });

    const result = await response.json();
    console.log("Twilio WhatsApp API response status:", response.status);
    console.log("Twilio WhatsApp API response:", JSON.stringify(result));
    return result;
  } catch (error) {
    console.error("Twilio WhatsApp error:", error);
    return { error: String(error) };
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      orderNumber, 
      customerName, 
      customerEmail, 
      totalAmount, 
      itemsCount,
      shippingAddress 
    }: OrderNotificationRequest = await req.json();

    console.log("Sending order notification for order:", orderNumber);

    const adminEmail = "toolsmanstore@gmail.com";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Send admin notification email
    const adminEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Toolsman <onboarding@resend.dev>",
        to: [adminEmail],
        subject: `New Order Received - ${orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 10px;">
              🛒 New Order Received!
            </h1>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #333;">Order Details</h2>
              <p><strong>Order Number:</strong> ${orderNumber}</p>
              <p><strong>Items:</strong> ${itemsCount} item(s)</p>
              <p><strong>Total Amount:</strong> KSh ${totalAmount.toLocaleString()}</p>
            </div>
            
            <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #333;">Customer Information</h2>
              <p><strong>Name:</strong> ${customerName}</p>
              <p><strong>Email:</strong> ${customerEmail}</p>
              <p><strong>Phone:</strong> ${shippingAddress.phone}</p>
            </div>
            
            <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #333;">Shipping Address</h2>
              <p>${shippingAddress.address}</p>
              <p>${shippingAddress.city}</p>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              Please log in to the admin dashboard to process this order.
            </p>
          </div>
        `,
      }),
    });

    const adminResult = await adminEmailResponse.json();
    console.log("Admin email sent:", adminResult);

    // Send customer confirmation email
    const customerEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Toolsman <onboarding@resend.dev>",
        to: [customerEmail],
        subject: `Order Confirmed - ${orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 10px;">
              ✅ Thank You for Your Order!
            </h1>
            
            <p style="font-size: 16px; color: #333;">
              Hi ${customerName},
            </p>
            <p style="font-size: 16px; color: #333;">
              Thank you for shopping with Toolsman! Your order has been received and is being processed.
            </p>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #333;">Order Summary</h2>
              <p><strong>Order Number:</strong> ${orderNumber}</p>
              <p><strong>Items:</strong> ${itemsCount} item(s)</p>
              <p><strong>Total Amount:</strong> KSh ${totalAmount.toLocaleString()}</p>
              <p><strong>Payment Method:</strong> Pay on Delivery</p>
            </div>
            
            <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #333;">Delivery Address</h2>
              <p>${shippingAddress.address}</p>
              <p>${shippingAddress.city}</p>
              <p><strong>Phone:</strong> ${shippingAddress.phone}</p>
            </div>
            
            <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #333;">What's Next?</h2>
              <p>We'll contact you shortly to confirm your order and arrange delivery.</p>
              <p>If you have any questions, feel free to reach out to us.</p>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              Thank you for choosing Toolsman!<br>
              <strong>The Toolsman Team</strong>
            </p>
          </div>
        `,
      }),
    });

    const customerResult = await customerEmailResponse.json();
    console.log("Customer email sent:", customerResult);

    // Send WhatsApp to admin
    const adminPhone = "+254742433416";
    const adminWhatsAppMessage = `🛒 *New Order Received!*\n\n📦 Order: ${orderNumber}\n👤 Customer: ${customerName}\n💰 Amount: KSh ${totalAmount.toLocaleString()}\n🛍️ Items: ${itemsCount}\n📞 Phone: ${shippingAddress.phone}\n📍 Address: ${shippingAddress.address}, ${shippingAddress.city}`;
    const adminWhatsAppResult = await sendWhatsApp(adminPhone, adminWhatsAppMessage);
    console.log("Admin WhatsApp result:", adminWhatsAppResult);

    // Send WhatsApp to customer
    const customerPhone = shippingAddress.phone.startsWith("+") 
      ? shippingAddress.phone 
      : `+254${shippingAddress.phone.replace(/^0/, "")}`;
    const customerWhatsAppMessage = `✅ *Thank you for your order at Toolsman!*\n\n📦 Order: ${orderNumber}\n💰 Total: KSh ${totalAmount.toLocaleString()}\n\n📞 We'll contact you shortly to confirm delivery.\n\nThank you for shopping with us! 🙏`;
    const customerWhatsAppResult = await sendWhatsApp(customerPhone, customerWhatsAppMessage);
    console.log("Customer WhatsApp result:", customerWhatsAppResult);

    return new Response(JSON.stringify({ 
      success: true, 
      adminResult, 
      customerResult,
      adminWhatsAppResult,
      customerWhatsAppResult
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending order notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
