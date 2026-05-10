import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, Lock } from "lucide-react";
import { ShippingInfo } from "./StepShipping";
import { DeliveryInfo } from "./StepDelivery";
import { PaymentInfo } from "./StepPayment";
import { CartItem } from "@/types/database";

interface Props {
  shipping: ShippingInfo;
  delivery: DeliveryInfo;
  payment: PaymentInfo;
  cartItems: CartItem[];
  cartTotal: number;
  onPlace: () => Promise<void>;
  onBack: () => void;
  isSubmitting: boolean;
}

export const StepReview = ({ shipping, delivery, payment, cartItems, cartTotal, onPlace, onBack, isSubmitting }: Props) => {
  const tax = cartTotal * 0.16;
  const grandTotal = cartTotal + delivery.fee + tax;

  const fmt = (n: number) => `Kshs ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-900">4. Review & Place Order</h2>

      {/* Shipping Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Shipping To</h3>
        <div className="text-sm text-gray-900 space-y-1">
          <p className="font-semibold">{shipping.fullName}</p>
          <p>{shipping.address}, {shipping.town}, {shipping.county}</p>
          <p className="text-gray-500">{shipping.phone} · {shipping.email}</p>
          {shipping.notes && <p className="text-gray-500 italic">"{shipping.notes}"</p>}
        </div>
      </div>

      {/* Delivery + Payment Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Delivery</h3>
          <p className="font-semibold text-gray-900 text-sm capitalize">{delivery.method} Delivery</p>
          <p className="text-sm text-gray-600">{fmt(delivery.fee)}</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Payment</h3>
          <p className="font-semibold text-gray-900 text-sm">M-Pesa ✓</p>
          <p className="text-xs text-gray-500 font-mono">{payment.mpesaCode}</p>
        </div>
      </div>

      {/* Items */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-700">{cartItems.length} Item{cartItems.length !== 1 ? "s" : ""}</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {cartItems.map(item => (
            <div key={item.id} className="flex items-center gap-4 px-5 py-4">
              <img
                src={item.product?.image_url || "/placeholder.svg"}
                alt={item.product?.name}
                className="w-14 h-14 object-contain rounded-lg border border-gray-100 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.product?.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</p>
              </div>
              <p className="font-bold text-gray-900 text-sm flex-shrink-0">{fmt((item.product?.price || 0) * item.quantity)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span className="font-semibold">{fmt(cartTotal)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-600">Shipping</span><span className="font-semibold">{fmt(delivery.fee)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-600">Tax (16%)</span><span className="font-semibold">{fmt(tax)}</span></div>
        <Separator className="bg-gray-200" />
        <div className="flex justify-between text-base font-extrabold text-gray-900">
          <span>Total</span><span>{fmt(grandTotal)}</span>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting} className="px-6 h-11 border-gray-300 font-semibold">← Back</Button>
        <Button
          onClick={onPlace}
          disabled={isSubmitting}
          className="bg-[#FF5722] hover:bg-[#e64a19] text-white font-bold px-8 h-11"
        >
          {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Placing Order…</> : <><Lock className="h-4 w-4 mr-2" />Place Order</>}
        </Button>
      </div>
    </div>
  );
};
