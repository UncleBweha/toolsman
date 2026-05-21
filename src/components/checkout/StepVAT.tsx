import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Receipt, ChevronRight, ChevronLeft, AlertCircle, CheckCircle } from "lucide-react";
import { validateKraPin, formatKraPin, calculateVat, formatKsh, VAT_RATE } from "@/lib/vatUtils";

export interface VATInfo {
  enabled: boolean;
  kraPin: string;
  taxName: string;
}

interface StepVATProps {
  subtotal: number;
  deliveryFee: number;
  data: VATInfo;
  onNext: (data: VATInfo) => void;
  onBack: () => void;
}

export const StepVAT = ({ subtotal, deliveryFee, data, onNext, onBack }: StepVATProps) => {
  const [enabled, setEnabled] = useState(data.enabled);
  const [kraPin, setKraPin] = useState(data.kraPin);
  const [taxName, setTaxName] = useState(data.taxName);
  const [pinError, setPinError] = useState("");
  const [nameError, setNameError] = useState("");
  const [touched, setTouched] = useState({ kraPin: false, taxName: false });

  const vat = calculateVat(subtotal);
  const grandTotal = enabled
    ? subtotal + deliveryFee + vat.vatAmount
    : subtotal + deliveryFee;

  const pinValid = !enabled || validateKraPin(kraPin);
  const nameValid = !enabled || taxName.trim().length >= 2;

  const handlePinChange = (val: string) => {
    setKraPin(val.toUpperCase());
    if (touched.kraPin) {
      setPinError(
        !val.trim()
          ? "KRA PIN is required"
          : !validateKraPin(val)
          ? "Invalid KRA PIN format (e.g. A123456789B)"
          : ""
      );
    }
  };

  const handlePinBlur = () => {
    setTouched((t) => ({ ...t, kraPin: true }));
    if (!kraPin.trim()) setPinError("KRA PIN is required");
    else if (!validateKraPin(kraPin)) setPinError("Invalid KRA PIN format (e.g. A123456789B)");
    else setPinError("");
  };

  const handleNameBlur = () => {
    setTouched((t) => ({ ...t, taxName: true }));
    if (!taxName.trim() || taxName.trim().length < 2)
      setNameError("Business/person name is required");
    else setNameError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enabled) {
      setTouched({ kraPin: true, taxName: true });
      if (!validateKraPin(kraPin)) {
        setPinError("Invalid KRA PIN format (e.g. A123456789B)");
        return;
      }
      if (!taxName.trim() || taxName.trim().length < 2) {
        setNameError("Business/person name is required");
        return;
      }
    }
    onNext({
      enabled,
      kraPin: enabled ? formatKraPin(kraPin) : "",
      taxName: enabled ? taxName.trim() : "",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">VAT / eTIMS Receipt</h2>
        <p className="text-sm text-gray-500">
          Optionally receive a tax invoice for your purchase.
        </p>
      </div>

      {/* VAT toggle */}
      <div
        className={`rounded-xl border-2 p-4 transition-all duration-200 cursor-pointer ${
          enabled
            ? "border-[#FF5722] bg-[#FF5722]/5"
            : "border-gray-200 bg-gray-50 hover:border-gray-300"
        }`}
        onClick={() => setEnabled((v) => !v)}
      >
        <div className="flex items-start gap-3">
          <Checkbox
            id="vat-toggle"
            checked={enabled}
            onCheckedChange={(v) => setEnabled(!!v)}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 data-[state=checked]:bg-[#FF5722] data-[state=checked]:border-[#FF5722]"
          />
          <div className="flex-1">
            <label
              htmlFor="vat-toggle"
              className="flex items-center gap-2 font-semibold text-sm text-gray-900 cursor-pointer"
            >
              <Receipt className="h-4 w-4 text-[#FF5722]" />
              Add {Math.round(VAT_RATE * 100)}% VAT and receive eTIMS receipt
            </label>
            <p className="text-xs text-gray-500 mt-1">
              A KRA-compliant tax invoice will be emailed to you after your order is placed.
            </p>
          </div>
        </div>
      </div>

      {/* KRA fields — shown only when VAT is enabled */}
      {enabled && (
        <div className="space-y-4 pl-1 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1.5">
            <Label htmlFor="kra-pin" className="font-semibold text-sm">
              KRA PIN <span className="text-red-500">*</span>
            </Label>
            <Input
              id="kra-pin"
              value={kraPin}
              onChange={(e) => handlePinChange(e.target.value)}
              onBlur={handlePinBlur}
              placeholder="e.g. A123456789B"
              maxLength={11}
              className={`font-mono uppercase tracking-wider ${
                pinError
                  ? "border-red-400 focus-visible:ring-red-400"
                  : pinValid && touched.kraPin
                  ? "border-green-400 focus-visible:ring-green-400"
                  : ""
              }`}
              autoComplete="off"
              spellCheck={false}
            />
            {pinError ? (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {pinError}
              </p>
            ) : pinValid && touched.kraPin && kraPin ? (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Valid KRA PIN
              </p>
            ) : (
              <p className="text-xs text-gray-400">Format: A123456789B (letter + 9 digits + letter)</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tax-name" className="font-semibold text-sm">
              Registered Name / Business Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="tax-name"
              value={taxName}
              onChange={(e) => { setTaxName(e.target.value); if (touched.taxName) setNameError(""); }}
              onBlur={handleNameBlur}
              placeholder="e.g. John Doe or Acme Hardware Ltd"
              className={nameError ? "border-red-400 focus-visible:ring-red-400" : ""}
            />
            {nameError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {nameError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Order total preview */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span className="font-semibold">{formatKsh(subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Delivery</span>
          <span className="font-semibold">{deliveryFee ? formatKsh(deliveryFee) : "—"}</span>
        </div>
        {enabled && (
          <div className="flex justify-between text-[#FF5722]">
            <span>VAT ({Math.round(VAT_RATE * 100)}%)</span>
            <span className="font-semibold">+ {formatKsh(vat.vatAmount)}</span>
          </div>
        )}
        <div className="flex justify-between font-extrabold text-gray-900 text-base border-t border-gray-200 pt-2 mt-1">
          <span>Total</span>
          <span>{formatKsh(grandTotal)}</span>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-[#FF5722] hover:bg-[#e64a19] text-white font-bold h-11"
        >
          {enabled ? "Continue with VAT" : "Continue without VAT"}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </form>
  );
};
