import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package } from "lucide-react";
import confetti from "canvas-confetti";

interface OrderSuccessScreenProps {
  orderNumber: string;
  estimatedDelivery: string;
  total: string;
}

export const OrderSuccessScreen = ({ orderNumber, estimatedDelivery, total }: OrderSuccessScreenProps) => {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    const duration = 4000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#FF5722", "#0f172a", "#FF8A65", "#FFB74D", "#ffffff"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#FF5722", "#0f172a", "#FF8A65", "#FFB74D", "#ffffff"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div
        className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 md:p-12 max-w-md w-full text-center"
        style={{ animation: "fadeScaleIn 0.5s ease-out" }}
      >
        <div className="flex items-center justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center border-4 border-green-100">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">
          Order Placed Successfully! 🎉
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          Thank you! Your order has been received and is being processed.
        </p>

        <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 mb-6 text-left space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 font-medium">Order Number</span>
            <span className="font-bold text-[#FF5722]">{orderNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 font-medium">Payment</span>
            <span className="font-semibold text-green-600">Confirmed ✓</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 font-medium">Total Paid</span>
            <span className="font-bold text-gray-900">{total}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 font-medium">Est. Delivery</span>
            <span className="font-semibold text-gray-900">{estimatedDelivery}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild className="flex-1 bg-[#FF5722] hover:bg-[#e64a19] text-white font-bold">
            <Link to="/">Continue Shopping</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 font-bold border-gray-300">
            <Link to="/account">
              <Package className="h-4 w-4 mr-2" />
              Track Order
            </Link>
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
