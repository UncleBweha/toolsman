import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { KENYA_COUNTIES, validateKenyanPhone, sanitizeInput } from "@/lib/checkoutConstants";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin } from "lucide-react";

export interface ShippingInfo {
  fullName: string;
  phone: string;
  email: string;
  county: string;
  town: string;
  address: string;
  apartment: string;
  notes: string;
}

interface Props {
  data: ShippingInfo;
  onNext: (data: ShippingInfo) => void;
}

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-semibold text-gray-700">{label}</Label>
    {children}
    {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
  </div>
);

const inputCls = "border border-gray-300 rounded-lg h-11 px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#FF5722] focus:border-transparent bg-white";

interface SavedAddress {
  id: string;
  label: string | null;
  full_name: string;
  phone: string;
  county: string;
  town: string;
  address: string;
  apartment: string | null;
  notes: string | null;
  is_default: boolean;
}

export const StepShipping = ({ data, onNext }: Props) => {
  const { user } = useAuth();
  const [form, setForm] = useState<ShippingInfo>(data);
  const [errors, setErrors] = useState<Partial<Record<keyof ShippingInfo, string>>>({});
  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const [selectedSaved, setSelectedSaved] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("user_addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .then(({ data }: any) => {
        const list = (data || []) as SavedAddress[];
        setSaved(list);
        // Auto-fill from default if form is empty
        const def = list.find(a => a.is_default) || list[0];
        if (def && !form.fullName && !form.address) {
          applyAddress(def);
          setSelectedSaved(def.id);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const applyAddress = (a: SavedAddress) => {
    setForm(prev => ({
      ...prev,
      fullName: a.full_name,
      phone: a.phone,
      county: a.county,
      town: a.town,
      address: a.address,
      apartment: a.apartment || "",
      notes: a.notes || prev.notes,
    }));
  };

  const set = (key: keyof ShippingInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: sanitizeInput(e.target.value) }));

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.fullName.trim()) errs.fullName = "Full name is required";
    if (!form.phone.trim()) errs.phone = "Phone number is required";
    else if (!validateKenyanPhone(form.phone)) errs.phone = "Enter a valid Kenyan number (e.g. 0712345678)";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Enter a valid email address";
    if (!form.county) errs.county = "Please select your county";
    if (!form.town.trim()) errs.town = "Town / area is required";
    if (!form.address.trim()) errs.address = "Address / landmark is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext(form);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-900">1. Shipping Information</h2>

      {saved.length > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-lg p-4">
          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-[#FF5722]" /> Use a saved address
          </Label>
          <select
            className={inputCls}
            value={selectedSaved}
            onChange={e => {
              setSelectedSaved(e.target.value);
              const a = saved.find(s => s.id === e.target.value);
              if (a) applyAddress(a);
            }}
          >
            <option value="">— Enter manually —</option>
            {saved.map(a => (
              <option key={a.id} value={a.id}>
                {(a.label ? `${a.label} · ` : "")}{a.full_name} · {a.town}, {a.county}{a.is_default ? " (default)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Full Name *" error={errors.fullName}>
          <Input className={inputCls} value={form.fullName} onChange={set("fullName")} placeholder="John Doe" />
        </Field>
        <Field label="Phone Number *" error={errors.phone}>
          <Input className={inputCls} value={form.phone} onChange={set("phone")} placeholder="+254 7XX XXX XXX" />
        </Field>
        <Field label="Email Address *" error={errors.email}>
          <Input className={inputCls} type="email" value={form.email} onChange={set("email")} placeholder="john@email.com" />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="County *" error={errors.county}>
          <select className={inputCls} value={form.county} onChange={set("county")}>
            <option value="">Select County</option>
            {KENYA_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Town / Area *" error={errors.town}>
          <Input className={inputCls} value={form.town} onChange={set("town")} placeholder="e.g. Westlands" />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Exact Address / Landmark *" error={errors.address}>
          <Input className={inputCls} value={form.address} onChange={set("address")} placeholder="e.g. 1234 Mombasa Road, near Total Petrol Station" />
        </Field>
        <Field label="Apartment / Building (Optional)">
          <Input className={inputCls} value={form.apartment} onChange={set("apartment")} placeholder="e.g. Apt 4B, Heron Court" />
        </Field>
      </div>

      <Field label="Additional Notes (Optional)">
        <textarea
          className={`${inputCls} h-20 resize-none pt-2`}
          value={form.notes}
          onChange={set("notes")}
          placeholder="Special delivery instructions..."
        />
      </Field>

      <div className="flex justify-end pt-2">
        <Button onClick={handleNext} className="bg-[#FF5722] hover:bg-[#e64a19] text-white font-bold px-8 h-11">
          Next: Shipping Method →
        </Button>
      </div>
    </div>
  );
};
