import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone, CreditCard, CheckCircle2, Loader2 } from "lucide-react";

export interface PaymentInfo {
  method: "mpesa";
  mpesaCode: string;
  confirmed: boolean;
}

interface Props {
  total: number;
  data: PaymentInfo;
  onNext: (data: PaymentInfo) => void;
  onBack: () => void;
}

const inputCls = "border border-gray-300 rounded-lg h-11 px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#FF5722] focus:border-transparent bg-white uppercase";

export const StepPayment = ({ total, data, onNext, onBack }: Props) => {
  const [mpesaCode, setMpesaCode] = useState(data.mpesaCode);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(data.confirmed);
  const [error, setError] = useState("");

  const formatPrice = (n: number) => `Kshs ${n.toLocaleString("en-US")}`;

  const handleConfirm = async () => {
    const code = mpesaCode.trim().toUpperCase();
    if (!code) { setError("Enter the M-Pesa confirmation code"); return; }
    if (!/^[A-Z0-9]{8,12}$/.test(code)) { setError("Enter a valid M-Pesa code (e.g. QGH4XXXXXXX)"); return; }
    setError("");
    setConfirming(true);
    // Simulate brief verification delay
    await new Promise(r => setTimeout(r, 1500));
    setConfirming(false);
    setConfirmed(true);
  };

  const handleNext = () => {
    if (!confirmed) { setError("Please confirm your M-Pesa payment first"); return; }
    onNext({ method: "mpesa", mpesaCode: mpesaCode.trim().toUpperCase(), confirmed: true });
  };

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
          <span className="font-bold text-gray-900">M-Pesa</span>
          <span className="ml-auto font-bold text-green-600 text-xs italic">M-PESA</span>
        </div>

        {!confirmed ? (
          <div className="bg-white rounded-lg p-4 border border-orange-100 space-y-4">
            <div className="text-sm text-gray-700 space-y-1">
              <p className="font-semibold text-gray-900">How to Pay:</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>Go to M-Pesa → Lipa na M-Pesa → Pay Bill</li>
                <li>Business No: <strong className="text-gray-900">522200</strong></li>
                <li>Account No: <strong className="text-gray-900">TOOLSMAN</strong></li>
                <li>Amount: <strong className="text-[#FF5722]">{formatPrice(total)}</strong></li>
                <li>Enter your M-Pesa PIN and confirm</li>
              </ol>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-gray-700">M-Pesa Confirmation Code *</Label>
              <Input
                className={inputCls}
                value={mpesaCode}
                onChange={e => { setMpesaCode(e.target.value.toUpperCase()); setError(""); }}
                placeholder="e.g. QGH4XXXXXXX"
                maxLength={12}
              />
              {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            </div>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={confirming}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-11"
            >
              {confirming ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying…</> : "Confirm Payment"}
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-4 border border-green-200 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
            <div>
              <p className="font-bold text-green-700">Payment Confirmed!</p>
              <p className="text-xs text-gray-500">Code: <strong>{mpesaCode}</strong></p>
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
          disabled={!confirmed}
          className="bg-[#FF5722] hover:bg-[#e64a19] text-white font-bold px-8 h-11 disabled:opacity-50"
        >
          Next: Review Order →
        </Button>
      </div>
    </div>
  );
};
