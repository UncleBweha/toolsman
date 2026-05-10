import { Button } from "@/components/ui/button";
import { Truck, Zap } from "lucide-react";
import { getDeliveryOptions } from "@/lib/checkoutConstants";

export interface DeliveryInfo {
  method: "standard" | "express";
  fee: number;
}

interface Props {
  county: string;
  data: DeliveryInfo;
  onNext: (data: DeliveryInfo) => void;
  onBack: () => void;
}

export const StepDelivery = ({ county, data, onNext, onBack }: Props) => {
  const options = getDeliveryOptions(county);

  const select = (opt: typeof options[0]) => {
    onNext({ method: opt.id as "standard" | "express", fee: opt.price });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-900">2. Shipping Method</h2>
      <p className="text-sm text-gray-500">
        Delivery options for <span className="font-semibold text-gray-900">{county}</span>
      </p>

      <div className="space-y-4">
        {options.map(opt => {
          const selected = data.method === opt.id;
          const Icon = opt.id === "express" ? Zap : Truck;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => select(opt)}
              className={`w-full flex items-center justify-between p-5 rounded-xl border-2 transition-all text-left ${
                selected
                  ? "border-[#FF5722] bg-orange-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? "border-[#FF5722]" : "border-gray-300"}`}>
                  {selected && <div className="w-2.5 h-2.5 rounded-full bg-[#FF5722]" />}
                </div>
                <Icon className={`h-5 w-5 flex-shrink-0 ${selected ? "text-[#FF5722]" : "text-gray-400"}`} />
                <div>
                  <p className="font-bold text-gray-900 text-sm">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.duration}</p>
                </div>
              </div>
              <span className="font-extrabold text-gray-900 text-base">Kshs {opt.price.toLocaleString()}</span>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} className="px-6 h-11 border-gray-300 font-semibold">
          ← Back
        </Button>
        <Button
          onClick={() => onNext(data)}
          className="bg-[#FF5722] hover:bg-[#e64a19] text-white font-bold px-8 h-11"
          disabled={!data.method}
        >
          Next: Payment →
        </Button>
      </div>
    </div>
  );
};
