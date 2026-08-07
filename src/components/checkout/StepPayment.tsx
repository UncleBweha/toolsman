import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone, CreditCard, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { validateKenyanPhone } from "@/lib/checkoutConstants";

export interface PaymentInfo {
  method: "mpesa";
  phone: string;
  checkoutRequestId: string;
  mpesaReceiptNumber: string;
  confirmed: boolean;
}

interface Props {
  total: number;
  data: PaymentInfo;
  onNext: (data: PaymentInfo) => void;
  onBack: () => void;
}

const inputCls = "border border-gray-300 rounded-lg h-11 px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#FF5722] focus:border-transparent bg-white";

type PushState = "idle" | "pushed" | "confirmed" | "failed";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 90000;

export const StepPayment = ({ total, data, onNext, onBack }: Props) => {
  const [phone, setPhone] = useState(data.phone);
  const [pushState, setPushState] = useState<PushState>(data.confirmed ? "confirmed" : "idle");
  const [checkoutRequestId, setCheckoutRequestId] = useState(data.checkoutRequestId);
  const [mpesaReceiptNumber, setMpesaReceiptNumber] = useState(data.mpesaReceiptNumber);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollDeadline = useRef<number>(0);

  useEffect(() => () => stopPolling(), []);

  const stopPolling = () => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  };

  const startPolling = (reqId: string) => {
    stopPolling();
    pollDeadline.current = Date.now() + POLL_TIMEOUT_MS;
    pollTimer.current = setInterval(async () => {
      if (Date.now() > pollDeadline.current) {
        stopPolling();
        setPushState("failed");
        setError("We didn't receive confirmation in time. Please try again.");
        return;
      }
      try {
        const { data: result, error: fnError } = await supabase.functions.invoke("mpesa-stk-query", {
          body: { checkoutRequestId: reqId },
        });
        if (fnError) return; // keep polling, transient network error
        if (result?.status === "success") {
          stopPolling();
          setMpesaReceiptNumber(result.mpesaReceiptNumber || "");
          setPushState("confirmed");
        } else if (result?.status === "failed") {
          stopPolling();
          setPushState("failed");
          setError(result.resultDesc || "Payment was not completed. Please try again.");
        }
        // "pending" → keep polling
      } catch {
        // transient — keep polling until timeout
      }
    }, POLL_INTERVAL_MS);
  };

  const handleSendPush = async () => {
    const cleaned = phone.trim();
    if (!validateKenyanPhone(cleaned)) {
      setError("Enter a valid Kenyan phone number (e.g. 0712345678)");
      return;
    }
    setError("");
    setSending(true);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke("mpesa-stk-push", {
        body: { phone: cleaned, amount: total },
      });
      if (fnError || result?.error) {
        throw new Error(result?.error || fnError?.message || "Failed to send STK push");
      }
      setCheckoutRequestId(result.checkoutRequestId);
      setPushState("pushed");
      startPolling(result.checkoutRequestId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send M-Pesa prompt. Please try again.");
      setPushState("failed");
    } finally {
      setSending(false);
    }
  };

  const handleRetry = () => {
    stopPolling();
    setPushState("idle");
    setError("");
    setCheckoutRequestId("");
    setMpesaReceiptNumber("");
  };

  const handleNext = () => {
    if (pushState !== "confirmed") { setError("Please complete the M-Pesa payment first"); return; }
    onNext({ method: "mpesa", phone: phone.trim(), checkoutRequestId, mpesaReceiptNumber, confirmed: true });
  };

  const formatPrice = (n: number) => `Kshs ${n.toLocaleString("en-US")}`;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-900">3. Payment</h2>

      {/* M-Pesa (active) */}
      <div className="border-2 border-[#FF5722] rounded-xl p-5 bg-orange-50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-5 h-5 rounded-full border-2 border-[#FF5722] flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF5722]" />
          </div>
          <Smartphone className="h-5 w-5 text-[#FF5722]" />
          <span className="font-bold text-gray-900">Lipa na M-Pesa</span>
          <span className="ml-auto font-bold text-green-600 text-xs italic">M-PESA</span>
        </div>

        {pushState === "idle" || pushState === "failed" ? (
          <div className="bg-white rounded-lg p-4 border border-orange-100 space-y-4">
            <p className="text-sm text-gray-700">
              Enter your M-Pesa number. You'll get a prompt on your phone to pay{" "}
              <strong className="text-[#FF5722]">{formatPrice(total)}</strong>.
            </p>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-gray-700">M-Pesa Phone Number *</Label>
              <Input
                className={inputCls}
                value={phone}
                onChange={e => { setPhone(e.target.value); setError(""); }}
                placeholder="e.g. 0712345678"
                maxLength={13}
              />
              {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            </div>
            <Button
              type="button"
              onClick={handleSendPush}
              disabled={sending}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-11"
            >
              {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending prompt…</> : "Send STK Push"}
            </Button>
          </div>
        ) : pushState === "pushed" ? (
          <div className="bg-white rounded-lg p-4 border border-orange-100 flex items-center gap-3">
            <Loader2 className="h-6 w-6 text-[#FF5722] flex-shrink-0 animate-spin" />
            <div>
              <p className="font-bold text-gray-900">Check your phone</p>
              <p className="text-xs text-gray-500">Enter your M-Pesa PIN on the prompt sent to {phone}</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-4 border border-green-200 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
            <div>
              <p className="font-bold text-green-700">Payment Confirmed!</p>
              {mpesaReceiptNumber && <p className="text-xs text-gray-500">Receipt: <strong>{mpesaReceiptNumber}</strong></p>}
            </div>
          </div>
        )}

        {pushState === "failed" && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-red-600 font-medium">{error || "Payment failed"}</p>
              <button type="button" onClick={handleRetry} className="text-xs font-bold text-[#FF5722] underline mt-1">
                Try again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Disabled options */}
      {[
        { label: "Visa", badge: "VISA", color: "text-blue-800" },
        { label: "Mastercard", badge: "Mastercard", color: "text-red-500" },
      ].map(opt => (
        <div key={opt.label} className="border border-gray-200 rounded-xl p-5 bg-gray-50 opacity-60 cursor-not-allowed flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
            <CreditCard className="h-5 w-5 text-gray-400" />
            <span className="font-semibold text-gray-500">{opt.label}</span>
          </div>
          <span className={`text-xs font-bold ${opt.color} italic`}>Coming Soon</span>
        </div>
      ))}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} className="px-6 h-11 border-gray-300 font-semibold">← Back</Button>
        <Button
          onClick={handleNext}
          disabled={pushState !== "confirmed"}
          className="bg-[#FF5722] hover:bg-[#e64a19] text-white font-bold px-8 h-11 disabled:opacity-50"
        >
          Next: Review Order →
        </Button>
      </div>
    </div>
  );
};
