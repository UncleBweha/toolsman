import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Plus, Trash2, Edit2, Check, X, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { KENYA_COUNTIES, validateKenyanPhone } from "@/lib/checkoutConstants";

export interface UserAddress {
  id: string;
  user_id: string;
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

const inputCls =
  "border border-gray-300 rounded-lg h-10 px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#FF5722] focus:border-transparent bg-white";

const empty = (uid: string): UserAddress => ({
  id: "", user_id: uid, label: "Home", full_name: "", phone: "",
  county: "", town: "", address: "", apartment: "", notes: "", is_default: false,
});

export default function AddressManager() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [list, setList] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<UserAddress | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("user_addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    setList((data || []) as UserAddress[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const startNew = () => {
    if (!user) return;
    setEditing({
      ...empty(user.id),
      full_name: profile?.full_name || "",
      phone: profile?.phone || "",
      is_default: list.length === 0,
    });
  };

  const save = async () => {
    if (!editing || !user) return;
    const a = editing;
    if (!a.full_name.trim() || !a.phone.trim() || !a.county || !a.town.trim() || !a.address.trim()) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    if (!validateKenyanPhone(a.phone)) {
      toast({ title: "Invalid phone number", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      label: a.label?.trim() || null,
      full_name: a.full_name.trim(),
      phone: a.phone.trim(),
      county: a.county,
      town: a.town.trim(),
      address: a.address.trim(),
      apartment: a.apartment?.trim() || null,
      notes: a.notes?.trim() || null,
      is_default: a.is_default,
    };
    const { error } = a.id
      ? await (supabase as any).from("user_addresses").update(payload).eq("id", a.id)
      : await (supabase as any).from("user_addresses").insert(payload);
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: a.id ? "Address updated" : "Address added" });
    setEditing(null);
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    const { error } = await (supabase as any).from("user_addresses").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", variant: "destructive" }); return; }
    toast({ title: "Address removed" });
    await load();
  };

  const setDefault = async (id: string) => {
    await (supabase as any).from("user_addresses").update({ is_default: true }).eq("id", id);
    await load();
  };

  if (loading) return <div className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-[#FF5722]" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Saved Addresses</h2>
        {!editing && (
          <Button size="sm" onClick={startNew} className="bg-[#FF5722] hover:bg-[#e64a19] text-white font-bold gap-1.5">
            <Plus className="h-4 w-4" /> Add Address
          </Button>
        )}
      </div>

      {editing && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-orange-50/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Label">
              <Input className={inputCls} value={editing.label || ""}
                onChange={e => setEditing({ ...editing, label: e.target.value })}
                placeholder="Home / Office" />
            </Field>
            <Field label="Recipient name *">
              <Input className={inputCls} value={editing.full_name}
                onChange={e => setEditing({ ...editing, full_name: e.target.value })} />
            </Field>
            <Field label="Phone *">
              <Input className={inputCls} value={editing.phone}
                onChange={e => setEditing({ ...editing, phone: e.target.value })}
                placeholder="07XX XXX XXX" />
            </Field>
            <Field label="County *">
              <select className={inputCls} value={editing.county}
                onChange={e => setEditing({ ...editing, county: e.target.value })}>
                <option value="">Select county</option>
                {KENYA_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Town / Area *">
              <Input className={inputCls} value={editing.town}
                onChange={e => setEditing({ ...editing, town: e.target.value })}
                placeholder="e.g. Westlands" />
            </Field>
            <Field label="Apartment / Unit (optional)">
              <Input className={inputCls} value={editing.apartment || ""}
                onChange={e => setEditing({ ...editing, apartment: e.target.value })} />
            </Field>
          </div>
          <Field label="Address / Landmark *">
            <Input className={inputCls} value={editing.address}
              onChange={e => setEditing({ ...editing, address: e.target.value })}
              placeholder="e.g. 1234 Mombasa Rd, near Total" />
          </Field>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={editing.is_default}
              onChange={e => setEditing({ ...editing, is_default: e.target.checked })} />
            Set as default address
          </label>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              <X className="h-4 w-4 mr-1" />Cancel
            </Button>
            <Button onClick={save} disabled={saving} className="bg-[#FF5722] hover:bg-[#e64a19] text-white font-bold">
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </div>
        </div>
      )}

      {list.length === 0 && !editing ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl py-10 text-center">
          <MapPin className="h-10 w-10 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No saved addresses yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {list.map(a => (
            <div key={a.id} className="border border-gray-200 rounded-xl p-4 bg-white">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-gray-900 text-sm truncate">{a.label || "Address"}</span>
                  {a.is_default && (
                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">DEFAULT</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!a.is_default && (
                    <button onClick={() => setDefault(a.id)} title="Set default"
                      className="p-1 text-gray-400 hover:text-yellow-500"><Star className="h-4 w-4" /></button>
                  )}
                  <button onClick={() => setEditing(a)} className="p-1 text-gray-400 hover:text-gray-700">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(a.id)} className="p-1 text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-800">{a.full_name}</p>
              <p className="text-xs text-gray-500">{a.phone}</p>
              <p className="text-xs text-gray-600 mt-1.5">
                {a.address}{a.apartment ? `, ${a.apartment}` : ""}
              </p>
              <p className="text-xs text-gray-500">{a.town}, {a.county}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <Label className="text-xs text-gray-500">{label}</Label>
    {children}
  </div>
);
