import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, Smartphone, Plus, Trash2, Edit2, Check, X, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { validateKenyanPhone } from "@/lib/checkoutConstants";

export interface PaymentMethod {
  id: string;
  user_id: string;
  type: "mpesa" | "card";
  label: string | null;
  mpesa_number: string | null;
  card_last4: string | null;
  card_brand: string | null;
  card_holder: string | null;
  card_exp_month: number | null;
  card_exp_year: number | null;
  is_default: boolean;
}

const inputCls =
  "border border-gray-300 rounded-lg h-10 px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#FF5722] focus:border-transparent bg-white";

function detectBrand(num: string): string {
  const n = num.replace(/\D/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^5[1-5]/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  if (/^6/.test(n)) return "Discover";
  return "Card";
}

export default function PaymentMethodsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [list, setList] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Forms
  const [mpesaForm, setMpesaForm] = useState<{ id?: string; label: string; number: string; isDefault: boolean } | null>(null);
  const [cardForm, setCardForm] = useState<{
    id?: string; label: string; holder: string; number: string; expMonth: string; expYear: string; isDefault: boolean;
  } | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("user_payment_methods")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    setList((data || []) as PaymentMethod[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const remove = async (id: string) => {
    if (!confirm("Remove this payment method?")) return;
    await (supabase as any).from("user_payment_methods").delete().eq("id", id);
    toast({ title: "Removed" });
    await load();
  };
  const setDefault = async (m: PaymentMethod) => {
    await (supabase as any).from("user_payment_methods").update({ is_default: true }).eq("id", m.id);
    await load();
  };

  const saveMpesa = async () => {
    if (!user || !mpesaForm) return;
    if (!validateKenyanPhone(mpesaForm.number)) { toast({ title: "Invalid M-Pesa number", variant: "destructive" }); return; }
    setSaving(true);
    const payload = {
      user_id: user.id,
      type: "mpesa",
      label: mpesaForm.label.trim() || null,
      mpesa_number: mpesaForm.number.trim(),
      is_default: mpesaForm.isDefault,
    };
    const { error } = mpesaForm.id
      ? await (supabase as any).from("user_payment_methods").update(payload).eq("id", mpesaForm.id)
      : await (supabase as any).from("user_payment_methods").insert(payload);
    setSaving(false);
    if (error) { toast({ title: "Save failed", variant: "destructive" }); return; }
    setMpesaForm(null);
    toast({ title: "Saved" });
    await load();
  };

  const saveCard = async () => {
    if (!user || !cardForm) return;
    const digits = cardForm.number.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) { toast({ title: "Invalid card number", variant: "destructive" }); return; }
    if (!cardForm.holder.trim()) { toast({ title: "Cardholder name required", variant: "destructive" }); return; }
    const m = parseInt(cardForm.expMonth, 10), y = parseInt(cardForm.expYear, 10);
    if (!(m >= 1 && m <= 12) || !(y >= 24 && y <= 99)) { toast({ title: "Invalid expiry", variant: "destructive" }); return; }
    setSaving(true);
    const payload = {
      user_id: user.id,
      type: "card",
      label: cardForm.label.trim() || null,
      card_last4: digits.slice(-4),                   // ONLY last4
      card_brand: detectBrand(digits),
      card_holder: cardForm.holder.trim(),
      card_exp_month: m,
      card_exp_year: 2000 + y,
      is_default: cardForm.isDefault,
    };
    const { error } = cardForm.id
      ? await (supabase as any).from("user_payment_methods").update(payload).eq("id", cardForm.id)
      : await (supabase as any).from("user_payment_methods").insert(payload);
    setSaving(false);
    if (error) { toast({ title: "Save failed", variant: "destructive" }); return; }
    setCardForm(null);
    toast({ title: "Card saved" });
    await load();
  };

  if (loading) return <div className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-[#FF5722]" /></div>;

  const mpesaList = list.filter(p => p.type === "mpesa");
  const cardList = list.filter(p => p.type === "card");

  return (
    <div className="space-y-6">
      {/* M-Pesa */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-600" /> M-Pesa Numbers
          </h3>
          {!mpesaForm && (
            <Button size="sm" variant="outline" onClick={() => setMpesaForm({ label: "", number: "", isDefault: mpesaList.length === 0 })}>
              <Plus className="h-4 w-4 mr-1" /> Add Number
            </Button>
          )}
        </div>

        {mpesaForm && (
          <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Label (optional)</Label>
                <Input className={inputCls} value={mpesaForm.label}
                  onChange={e => setMpesaForm({ ...mpesaForm, label: e.target.value })}
                  placeholder="My phone" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">M-Pesa Number *</Label>
                <Input className={inputCls} value={mpesaForm.number}
                  onChange={e => setMpesaForm({ ...mpesaForm, number: e.target.value })}
                  placeholder="07XX XXX XXX" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={mpesaForm.isDefault}
                onChange={e => setMpesaForm({ ...mpesaForm, isDefault: e.target.checked })} />
              Default M-Pesa number
            </label>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setMpesaForm(null)} disabled={saving}>Cancel</Button>
              <Button onClick={saveMpesa} disabled={saving} className="bg-[#FF5722] hover:bg-[#e64a19] text-white font-bold">
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save
              </Button>
            </div>
          </div>
        )}

        {mpesaList.length === 0 && !mpesaForm ? (
          <p className="text-xs text-gray-400">No M-Pesa numbers saved.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mpesaList.map(m => (
              <div key={m.id} className="border border-gray-200 rounded-xl p-3 flex items-center justify-between bg-white">
                <div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-green-600" />
                    <span className="font-semibold text-sm">{m.label || "M-Pesa"}</span>
                    {m.is_default && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">DEFAULT</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 font-mono">{m.mpesa_number}</p>
                </div>
                <div className="flex items-center gap-1">
                  {!m.is_default && (
                    <button onClick={() => setDefault(m)} className="p-1 text-gray-400 hover:text-yellow-500" title="Default">
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => setMpesaForm({ id: m.id, label: m.label || "", number: m.mpesa_number || "", isDefault: m.is_default })}
                    className="p-1 text-gray-400 hover:text-gray-700"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => remove(m.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Cards */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-600" /> Cards
          </h3>
          {!cardForm && (
            <Button size="sm" variant="outline" onClick={() => setCardForm({
              label: "", holder: "", number: "", expMonth: "", expYear: "", isDefault: cardList.length === 0,
            })}>
              <Plus className="h-4 w-4 mr-1" /> Add Card
            </Button>
          )}
        </div>

        {cardForm && (
          <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
            <p className="text-[11px] text-gray-500 -mt-1">
              We only store the last 4 digits, brand, and expiry. Your full card number is never saved.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Label (optional)</Label>
                <Input className={inputCls} value={cardForm.label}
                  onChange={e => setCardForm({ ...cardForm, label: e.target.value })}
                  placeholder="Personal Visa" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Cardholder *</Label>
                <Input className={inputCls} value={cardForm.holder}
                  onChange={e => setCardForm({ ...cardForm, holder: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs text-gray-500">Card Number *</Label>
                <Input className={inputCls} inputMode="numeric" autoComplete="cc-number"
                  value={cardForm.number}
                  onChange={e => setCardForm({ ...cardForm, number: e.target.value.replace(/[^\d ]/g, "") })}
                  placeholder="•••• •••• •••• ••••" />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Exp Month *</Label>
                  <Input className={inputCls} value={cardForm.expMonth} maxLength={2}
                    onChange={e => setCardForm({ ...cardForm, expMonth: e.target.value.replace(/\D/g, "") })}
                    placeholder="MM" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Exp Year *</Label>
                  <Input className={inputCls} value={cardForm.expYear} maxLength={2}
                    onChange={e => setCardForm({ ...cardForm, expYear: e.target.value.replace(/\D/g, "") })}
                    placeholder="YY" />
                </div>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={cardForm.isDefault}
                onChange={e => setCardForm({ ...cardForm, isDefault: e.target.checked })} />
              Default card
            </label>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCardForm(null)} disabled={saving}>Cancel</Button>
              <Button onClick={saveCard} disabled={saving} className="bg-[#FF5722] hover:bg-[#e64a19] text-white font-bold">
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save Card
              </Button>
            </div>
          </div>
        )}

        {cardList.length === 0 && !cardForm ? (
          <p className="text-xs text-gray-400">No cards saved.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cardList.map(c => (
              <div key={c.id} className="border border-gray-200 rounded-xl p-3 flex items-center justify-between bg-white">
                <div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-sm">{c.card_brand} •••• {c.card_last4}</span>
                    {c.is_default && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">DEFAULT</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {c.card_holder} · Exp {String(c.card_exp_month).padStart(2,"0")}/{String(c.card_exp_year).slice(-2)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {!c.is_default && (
                    <button onClick={() => setDefault(c)} className="p-1 text-gray-400 hover:text-yellow-500" title="Default">
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => remove(c.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
