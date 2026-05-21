import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Truck, Zap, Store, MapPin, Clock, Phone, ChevronRight, ExternalLink } from "lucide-react";
import { getDeliveryOptions, STORE_BRANCHES, StoreBranchId } from "@/lib/checkoutConstants";

export interface DeliveryInfo {
  method: "standard" | "express" | "pickup";
  fee: number;
  // In-store pickup fields (only relevant when method === "pickup")
  pickupBranchId?: StoreBranchId;
  pickupBranchName?: string;
  pickupEstimate?: string;
  isPickupOrder?: boolean;
}

interface Props {
  county: string;
  data: DeliveryInfo;
  onNext: (data: DeliveryInfo) => void;
  onBack: () => void;
}

export const StepDelivery = ({ county, data, onNext, onBack }: Props) => {
  const deliveryOptions = getDeliveryOptions(county);

  const [selected, setSelected] = useState<DeliveryInfo["method"]>(data.method || "standard");
  const [selectedBranch, setSelectedBranch] = useState<StoreBranchId | "">(
    (data.pickupBranchId as StoreBranchId) || ""
  );
  const [error, setError] = useState("");

  const handleSelect = (method: DeliveryInfo["method"]) => {
    setSelected(method);
    setError("");
    // Auto-select the only branch when pickup is chosen
    if (method === "pickup") {
      setSelectedBranch(STORE_BRANCHES[0].id as StoreBranchId);
    } else {
      setSelectedBranch("");
    }
  };

  const handleContinue = () => {
    if (selected === "pickup" && !selectedBranch) {
      setError("Please select a pickup branch to continue.");
      return;
    }

    if (selected === "pickup") {
      const branch = STORE_BRANCHES.find(b => b.id === selectedBranch)!;
      onNext({
        method: "pickup",
        fee: 0,
        pickupBranchId: branch.id as StoreBranchId,
        pickupBranchName: branch.name,
        pickupEstimate: branch.pickupEstimate,
        isPickupOrder: true,
      });
    } else {
      const opt = deliveryOptions.find(o => o.id === selected)!;
      onNext({
        method: selected as "standard" | "express",
        fee: opt.price,
        isPickupOrder: false,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Delivery Method</h2>
        <p className="text-sm text-gray-500">
          {selected !== "pickup" && county && (
            <>Shipping to <span className="font-semibold text-gray-900">{county}</span></>
          )}
        </p>
      </div>

      <div className="space-y-3">
        {/* ── Standard Delivery ── */}
        {deliveryOptions.map(opt => {
          const isSelected = selected === opt.id;
          const Icon = opt.id === "express" ? Zap : Truck;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt.id as "standard" | "express")}
              className={`w-full flex items-center justify-between p-5 rounded-xl border-2 transition-all text-left ${
                isSelected ? "border-[#FF5722] bg-orange-50" : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? "border-[#FF5722]" : "border-gray-300"}`}>
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#FF5722]" />}
                </div>
                <Icon className={`h-5 w-5 flex-shrink-0 ${isSelected ? "text-[#FF5722]" : "text-gray-400"}`} />
                <div>
                  <p className="font-bold text-gray-900 text-sm">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.duration}</p>
                </div>
              </div>
              <span className="font-extrabold text-gray-900 text-base">Kshs {opt.price.toLocaleString()}</span>
            </button>
          );
        })}

        {/* ── In-Store Pickup ── */}
        <button
          type="button"
          onClick={() => handleSelect("pickup")}
          className={`w-full p-5 rounded-xl border-2 transition-all text-left ${
            selected === "pickup" ? "border-[#FF5722] bg-orange-50" : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected === "pickup" ? "border-[#FF5722]" : "border-gray-300"}`}>
                {selected === "pickup" && <div className="w-2.5 h-2.5 rounded-full bg-[#FF5722]" />}
              </div>
              <Store className={`h-5 w-5 flex-shrink-0 ${selected === "pickup" ? "text-[#FF5722]" : "text-gray-400"}`} />
              <div>
                <p className="font-bold text-gray-900 text-sm">In-Store Pickup</p>
                <p className="text-xs text-gray-500 mt-0.5">Collect from a Toolsman branch near you</p>
              </div>
            </div>
            <span className="font-extrabold text-green-600 text-base">FREE</span>
          </div>

          {/* Branch info — shows automatically since there's only one branch */}
          {selected === "pickup" && (
            <div className="mt-4 ml-9 space-y-3" onClick={e => e.stopPropagation()}>
              {(() => {
                const branch = STORE_BRANCHES[0];
                return (
                  <div className="bg-white border-2 border-[#FF5722]/30 rounded-xl p-4 space-y-2">
                    <p className="font-bold text-gray-900 text-sm">{branch.name}</p>
                    <p className="text-xs text-gray-600 flex items-start gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[#FF5722] flex-shrink-0 mt-0.5" />
                      {branch.address}
                    </p>
                    <p className="text-xs text-gray-600 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      {branch.hours}
                    </p>
                    <p className="text-xs text-gray-600 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      {branch.phone}
                    </p>
                    <p className="text-xs font-semibold text-[#FF5722] pt-1">⏱ {branch.pickupEstimate}</p>
                    <a
                      href={branch.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 pt-0.5"
                    >
                      View on Google Maps <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                );
              })()}

              {/* How pickup works */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800 font-semibold mb-1">📋 How pickup works:</p>
                <ol className="text-xs text-amber-700 list-decimal list-inside space-y-0.5">
                  <li>Place your order and complete payment</li>
                  <li>You'll receive an order confirmation code via SMS/email</li>
                  <li>Visit our Simara Mall shop with your confirmation code</li>
                  <li>Show the code at the counter to collect your items</li>
                </ol>
              </div>
            </div>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 font-medium">{error}</p>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} className="px-6 h-11 border-gray-300 font-semibold">
          ← Back
        </Button>
        <Button
          onClick={handleContinue}
          className="bg-[#FF5722] hover:bg-[#e64a19] text-white font-bold px-8 h-11 flex items-center gap-2"
        >
          Continue <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
