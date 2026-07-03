import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCartContext } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingBag, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CHECKOUT_SESSION_KEY, getDeliveryFee } from "@/lib/checkoutConstants";
import { StepShipping, ShippingInfo } from "@/components/checkout/StepShipping";
import { StepDelivery, DeliveryInfo } from "@/components/checkout/StepDelivery";
import { StepVAT, VATInfo } from "@/components/checkout/StepVAT";
import { StepPayment, PaymentInfo } from "@/components/checkout/StepPayment";
import { StepReview } from "@/components/checkout/StepReview";
import { OrderSuccessScreen } from "@/components/checkout/OrderSuccessScreen";
import { calculateVat, generateEtimsInvoiceNumber } from "@/lib/vatUtils";

// STEP ORDER: Shipping(0) → Delivery(1) → VAT(2) → Payment(3) → Review(4)
// VAT must come BEFORE Payment so the total shown to customer includes VAT
const STEPS = ["Shipping", "Delivery", "VAT", "Payment", "Review"];

const defaultShipping: ShippingInfo = {
  fullName: "", phone: "", email: "", county: "", town: "", address: "", apartment: "", notes: "",
};
const defaultDelivery: DeliveryInfo = { method: "standard", fee: 1000, isPickupOrder: false };
const defaultVAT: VATInfo = { enabled: false, kraPin: "", taxName: "" };
const defaultPayment: PaymentInfo = { method: "mpesa", mpesaCode: "", confirmed: false };

function loadSession() {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSession(data: object) {
  try { sessionStorage.setItem(CHECKOUT_SESSION_KEY, JSON.stringify(data)); } catch {}
}

const StepIndicator = ({ current }: { current: number }) => (
  <div className="flex items-center gap-2 md:gap-3 mb-8 overflow-x-auto pb-2">
    {STEPS.map((label, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <div key={label} className="flex items-center gap-2 flex-shrink-0">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
            done ? "bg-green-500 text-white" : active ? "bg-[#0f172a] text-white" : "bg-gray-100 text-gray-400 border border-gray-200"
          }`}>
            {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <span className={`text-xs sm:text-sm font-semibold whitespace-nowrap ${
            active ? "text-gray-900" : done ? "text-green-600" : "text-gray-400"
          }`}>{label}</span>
          {i < STEPS.length - 1 && (
            <div className={`w-6 md:w-10 h-px flex-shrink-0 ${done ? "bg-green-400" : "bg-gray-200"}`} />
          )}
        </div>
      );
    })}
  </div>
);

const OrderSummaryPanel = ({
  cartItems, cartTotal, delivery, vatInfo,
}: {
  cartItems: any[];
  cartTotal: number;
  delivery: DeliveryInfo;
  vatInfo: VATInfo;
}) => {
  const vatCalc = calculateVat(cartTotal);
  const vatAmount = vatInfo.enabled ? vatCalc.vatAmount : 0;
  const total = cartTotal + delivery.fee + vatAmount;
  const fmt = (n: number) => `Kshs ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 sticky top-24">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-900">Order Summary</h3>
        <Link to="/cart" className="text-xs text-blue-600 hover:underline font-medium">Edit Cart</Link>
      </div>
      <div className="space-y-3 max-h-56 overflow-y-auto mb-4">
        {cartItems.map(item => (
          <div key={item.id} className="flex items-center gap-3">
            <img
              src={item.product?.image_url || "/placeholder.svg"}
              alt=""
              className="w-12 h-12 object-contain rounded border border-gray-100 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 line-clamp-2">{item.product?.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity}</p>
            </div>
            <span className="text-xs font-bold text-gray-900 flex-shrink-0">
              {fmt((item.product?.price || 0) * item.quantity)}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span className="font-semibold">{fmt(cartTotal)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>{vatInfo.enabled ? "Delivery" : "Shipping"}</span>
          {delivery.method === "pickup" || delivery.isPickupOrder ? (
            <span className="font-semibold text-green-600">FREE (Pickup)</span>
          ) : (
            <span className="font-semibold">{delivery.fee ? fmt(delivery.fee) : "—"}</span>
          )}
        </div>
        {vatInfo.enabled && (
          <div className="flex justify-between text-[#FF5722]">
            <span>VAT (16%)</span>
            <span className="font-semibold">+ {fmt(vatAmount)}</span>
          </div>
        )}
        <div className="flex justify-between font-extrabold text-gray-900 text-base border-t border-gray-200 pt-2 mt-2">
          <span>Total{vatInfo.enabled ? " (incl. VAT)" : ""}</span>
          <span>{fmt(total)}</span>
        </div>
        {vatInfo.enabled && (
          <p className="text-[10px] text-gray-400 leading-tight">
            eTIMS receipt will be sent to your email after order placement.
          </p>
        )}
      </div>
    </div>
  );
};

const Checkout = () => {
  const { cartItems, cartTotal, clearCart, isLoading: cartLoading } = useCartContext();
  const { user, profile, isAdmin } = useAuth();
  const { toast } = useToast();

  const saved = loadSession();

  const [step, setStep] = useState<number>(saved?.step || 0);
  const [shipping, setShipping] = useState<ShippingInfo>(
    saved?.shipping || {
      ...defaultShipping,
      fullName: profile?.full_name || "",
      phone: profile?.phone || "",
      email: user?.email || "",
    }
  );
  const [delivery, setDelivery] = useState<DeliveryInfo>(saved?.delivery || defaultDelivery);
  const [vatInfo, setVatInfo] = useState<VATInfo>(saved?.vatInfo || defaultVAT);
  const [payment, setPayment] = useState<PaymentInfo>(saved?.payment || defaultPayment);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<{ number: string; total: number; delivery: DeliveryInfo } | null>(null);

  // Recalculate delivery fee whenever county or method changes
  useEffect(() => {
    if (!shipping.county) return;
    const fee = getDeliveryFee(shipping.county, delivery.method);
    setDelivery(prev => ({ ...prev, fee }));
  }, [shipping.county, delivery.method]);

  // Persist to session on every state change
  useEffect(() => {
    saveSession({ step, shipping, delivery, vatInfo, payment });
  }, [step, shipping, delivery, vatInfo, payment]);

  const goToStep = (s: number) => setStep(s);

  // Step handlers — ordered: Shipping(0) → Delivery(1) → VAT(2) → Payment(3) → Review(4)
  const handleShippingNext = (data: ShippingInfo) => {
    setShipping(data);
    const fee = getDeliveryFee(data.county, delivery.method);
    setDelivery(prev => ({ ...prev, fee }));
    goToStep(1);
  };

  const handleDeliveryNext = (data: DeliveryInfo) => {
    setDelivery(data);
    goToStep(2); // → VAT
  };

  const handleVATNext = (data: VATInfo) => {
    setVatInfo(data);
    goToStep(3); // → Payment (grand total now includes VAT if opted in)
  };

  const handlePaymentNext = (data: PaymentInfo) => {
    setPayment(data);
    goToStep(4); // → Review
  };

  const handlePlaceOrder = async () => {
    if (!user || cartItems.length === 0) return;
    setIsSubmitting(true);
    try {
      const vatCalc = calculateVat(cartTotal);
      const vatAmount = vatInfo.enabled ? vatCalc.vatAmount : 0;
      const grandTotal = cartTotal + delivery.fee + vatAmount;
      const tempOrderNumber = `TM-${Date.now()}`;
      const etimsInvoice = vatInfo.enabled ? generateEtimsInvoiceNumber() : null;

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([{
          user_id: user.id,
          order_number: tempOrderNumber,
          subtotal: cartTotal,
          total: grandTotal,
          shipping_address: { ...shipping } as any,
          notes: delivery.isPickupOrder
            ? `PICKUP ORDER — Branch: ${delivery.pickupBranchName || "N/A"}. Payment: M-Pesa ${payment.mpesaCode}. Customer notes: ${shipping.notes}`
            : `Delivery: ${delivery.method} (${delivery.fee}). Payment: M-Pesa ${payment.mpesaCode}. Customer notes: ${shipping.notes}`,
          // VAT / eTIMS fields
          vat_enabled: vatInfo.enabled,
          vat_amount: vatAmount,
          kra_pin: vatInfo.enabled ? vatInfo.kraPin : null,
          tax_name: vatInfo.enabled ? vatInfo.taxName : null,
          etims_invoice_number: etimsInvoice,
          receipt_status: vatInfo.enabled ? "pending" : null,
          // Pickup fields
          is_pickup_order: delivery.isPickupOrder || false,
          pickup_branch_id: delivery.isPickupOrder ? delivery.pickupBranchId : null,
          pickup_branch_name: delivery.isPickupOrder ? delivery.pickupBranchName : null,
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      const { error: itemsError } = await supabase.from("order_items").insert(
        cartItems.map(item => ({
          order_id: order.id,
          product_id: item.product_id,
          product_name: item.product?.name || "Unknown",
          product_image: item.product?.image_url || null,
          quantity: item.quantity,
          unit_price: item.product?.price || 0,
          total_price: (item.product?.price || 0) * item.quantity,
        }))
      );
      if (itemsError) throw itemsError;

      // Send notification (non-blocking)
      try {
        await supabase.functions.invoke("send-order-notification", {
          body: {
            orderNumber: order.order_number,
            customerName: shipping.fullName,
            customerEmail: shipping.email,
            totalAmount: grandTotal,
            itemsCount: cartItems.length,
            vatEnabled: vatInfo.enabled,
            vatAmount,
            kraPin: vatInfo.kraPin,
            shippingAddress: {
              address: shipping.address,
              city: shipping.town,
              county: shipping.county,
              phone: shipping.phone,
            },
          },
        });
      } catch {}

      await clearCart();
      sessionStorage.removeItem(CHECKOUT_SESSION_KEY);
      setOrderResult({ number: order.order_number, total: grandTotal, delivery });
    } catch (err: any) {
      toast({
        title: "Error placing order",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Guard states ──────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Please sign in to checkout</h1>
          <p className="text-gray-500 mb-6">Create an account or sign in to complete your purchase</p>
          <Button asChild className="bg-[#FF5722] hover:bg-[#e64a19] text-white font-bold">
            <Link to="/auth">Sign In / Register</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Admin accounts cannot place orders</h1>
          <p className="text-gray-500 mb-6">Please use a regular customer account.</p>
          <div className="flex gap-3 justify-center">
            <Button asChild variant="outline"><Link to="/admin">Go to Admin Panel</Link></Button>
            <Button asChild className="bg-[#FF5722] hover:bg-[#e64a19] text-white font-bold">
              <Link to="/">Continue Browsing</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (cartLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF5722]" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!orderResult && cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
          <Button asChild className="bg-[#FF5722] hover:bg-[#e64a19] text-white font-bold mt-4">
            <Link to="/">Start Shopping</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  // Grand total = subtotal + delivery + (VAT if opted in)
  const vatCalc = calculateVat(cartTotal);
  const vatAmount = vatInfo.enabled ? vatCalc.vatAmount : 0;
  const grandTotal = cartTotal + delivery.fee + vatAmount;

  const estimatedDelivery = delivery.method === "express"
    ? (shipping.county === "Nairobi" ? "Same day / Next day" : "1–3 business days")
    : (shipping.county === "Nairobi" ? "24–48 hours" : "2–5 business days");

  if (orderResult) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50/30">
        <Header />
        <main className="flex-1 container py-8">
          <OrderSuccessScreen
            orderNumber={orderResult.number}
            total={`Kshs ${orderResult.total.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
            estimatedDelivery={estimatedDelivery}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/30">
      <Header />
      <main className="flex-1 container py-8 max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Checkout</h1>
        <StepIndicator current={step} />

        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Step content */}
          <div className="lg:col-span-7 bg-white border border-gray-200 rounded-xl shadow-sm p-6 md:p-8">

            {/* Step 0: Shipping address */}
            {step === 0 && (
              <StepShipping data={shipping} onNext={handleShippingNext} />
            )}

            {/* Step 1: Delivery method */}
            {step === 1 && (
              <StepDelivery
                county={shipping.county}
                data={delivery}
                onNext={handleDeliveryNext}
                onBack={() => goToStep(0)}
              />
            )}

            {/* Step 2: VAT / eTIMS — BEFORE payment so total is accurate */}
            {step === 2 && (
              <StepVAT
                subtotal={cartTotal}
                deliveryFee={delivery.fee}
                data={vatInfo}
                onNext={handleVATNext}
                onBack={() => goToStep(1)}
              />
            )}

            {/* Step 3: Payment — total shown already includes VAT if opted in */}
            {step === 3 && (
              <StepPayment
                total={grandTotal}   // ← includes VAT
                data={payment}
                onNext={handlePaymentNext}
                onBack={() => goToStep(2)}
              />
            )}

            {/* Step 4: Review & place order */}
            {step === 4 && (
              <StepReview
                shipping={shipping}
                delivery={delivery}
                payment={payment}
                vatInfo={vatInfo}
                cartItems={cartItems}
                cartTotal={cartTotal}
                onPlace={handlePlaceOrder}
                onBack={() => goToStep(3)}
                isSubmitting={isSubmitting}
              />
            )}
          </div>

          {/* Order summary sidebar */}
          <div className="lg:col-span-5">
            <OrderSummaryPanel
              cartItems={cartItems}
              cartTotal={cartTotal}
              delivery={delivery}
              vatInfo={vatInfo}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
