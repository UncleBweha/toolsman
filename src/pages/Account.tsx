import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, LogOut, User, Package, Heart, MapPin, CreditCard,
  Shield, Trash2, Edit2, LayoutDashboard, ChevronRight, AlertTriangle, Check,
  Camera, ChevronDown,
} from "lucide-react";
import AddressManager from "@/components/account/AddressManager";
import PaymentMethodsManager from "@/components/account/PaymentMethodsManager";

type Section = "dashboard" | "orders" | "wishlist" | "profile" | "address" | "payment" | "security";

const NAV_ITEMS: { id: Section; label: string; icon: any; href?: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: Package },
  { id: "wishlist", label: "Wishlist", icon: Heart, href: "/wishlist" },
  { id: "profile", label: "Profile", icon: User },
  { id: "address", label: "Addresses", icon: MapPin },
  { id: "payment", label: "Payment Methods", icon: CreditCard },
  { id: "security", label: "Security", icon: Shield },
];

const inputCls =
  "border border-gray-300 rounded-lg h-10 px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#FF5722] focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-400";

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  shipping_cost: number | null;
  total: number;
  notes: string | null;
  shipping_address: any;
  created_at: string;
}
interface OrderItem {
  id: string;
  order_id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

const Account = () => {
  const { user, profile, isLoading, signOut, updateProfile, isAdmin, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [section, setSection] = useState<Section>("dashboard");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});

  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    firstName: "", middleName: "", lastName: "", phone: "", email: "",
  });

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [delPwd, setDelPwd] = useState("");
  const [delLoading, setDelLoading] = useState(false);

  useEffect(() => { if (!isLoading && !user) navigate("/auth"); }, [user, isLoading, navigate]);

  useEffect(() => {
    if (profile || user) {
      const p: any = profile || {};
      // Use stored parts when present; else split full_name
      const parts = (p.full_name || "").split(" ").filter(Boolean);
      setForm({
        firstName: p.first_name || parts[0] || "",
        middleName: p.middle_name || (parts.length > 2 ? parts.slice(1, -1).join(" ") : ""),
        lastName:  p.last_name  || (parts.length > 1 ? parts.slice(-1)[0] : ""),
        phone: p.phone || "",
        email: user?.email || "",
      });
    }
  }, [profile, user]);

  useEffect(() => {
    if (!user) return;
    setOrdersLoading(true);
    supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { setOrders((data || []) as OrderRow[]); setOrdersLoading(false); });
  }, [user]);

  const toggleOrder = async (orderId: string) => {
    if (expandedOrder === orderId) { setExpandedOrder(null); return; }
    setExpandedOrder(orderId);
    if (!orderItems[orderId]) {
      const { data } = await supabase.from("order_items").select("*").eq("order_id", orderId);
      setOrderItems(prev => ({ ...prev, [orderId]: (data || []) as OrderItem[] }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast({ title: "First and last name are required", variant: "destructive" }); return;
    }
    setSaving(true);
    const fullName = [form.firstName, form.middleName, form.lastName]
      .map(s => s.trim()).filter(Boolean).join(" ");
    const { error } = await supabase.from("profiles").update({
      first_name: form.firstName.trim(),
      middle_name: form.middleName.trim() || null,
      last_name: form.lastName.trim(),
      full_name: fullName,
      phone: form.phone.trim(),
    }).eq("id", user!.id);
    setSaving(false);
    if (error) { toast({ title: "Failed to update profile", variant: "destructive" }); return; }
    toast({ title: "Profile updated" });
    setEditMode(false);
    refreshProfile();
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      // Resize/compress client-side
      const blob = await compressImage(file, 512, 0.85);
      const ext = "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      // Bust cache
      const url = `${pub.publicUrl}?v=${Date.now()}`;
      const { error: updErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (updErr) throw updErr;
      toast({ title: "Profile photo updated" });
      refreshProfile();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next.length < 6) { toast({ title: "Password too short", description: "Use at least 6 characters", variant: "destructive" }); return; }
    if (pw.next !== pw.confirm) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
    setPwSaving(true);
    const { error: signErr } = await supabase.auth.signInWithPassword({ email: user!.email!, password: pw.current });
    if (signErr) { setPwSaving(false); toast({ title: "Current password incorrect", variant: "destructive" }); return; }
    const { error } = await supabase.auth.updateUser({ password: pw.next });
    setPwSaving(false);
    if (error) { toast({ title: "Failed to update password", description: error.message, variant: "destructive" }); }
    else { setPw({ current: "", next: "", confirm: "" }); toast({ title: "Password updated" }); }
  };

  const handleDeleteAccount = async () => {
    if (!delPwd) { toast({ title: "Password required", variant: "destructive" }); return; }
    setDelLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", { body: { password: delPwd } });
      if (error || (data && (data as any).error)) {
        throw new Error((data as any)?.error || error?.message || "Failed to delete account");
      }
      await supabase.auth.signOut();
      toast({ title: "Account deleted" });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Could not delete account", description: err.message, variant: "destructive" });
    } finally { setDelLoading(false); setDelOpen(false); }
  };

  const handleSignOut = async () => { await signOut(); navigate("/"); };
  const fmt = (n: number) => `KSh ${Number(n).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;

  const statusColor: Record<string, string> = {
    completed: "bg-green-100 text-green-700 border-green-200",
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    processing: "bg-blue-100 text-blue-700 border-blue-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#FF5722]" /></div>;
  }

  const totalSpent = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const fullDisplayName = [form.firstName, form.lastName].filter(Boolean).join(" ") || profile?.full_name || "";
  const initials = (fullDisplayName || user?.email || "U")
    .split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const activeLabel = NAV_ITEMS.find(n => n.id === section)?.label || "Account";
  const avatarUrl = (profile as any)?.avatar_url as string | undefined;

  const NavList = ({ onSelect }: { onSelect?: () => void }) => (
    <div className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = section === item.id;
        const cls = `w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
          active ? "bg-orange-50 text-[#FF5722] border border-orange-100" : "text-gray-600 hover:bg-gray-100"
        }`;
        if (item.href) {
          return (
            <Link key={item.id} to={item.href} className={cls} onClick={onSelect}>
              <Icon className="h-4 w-4 flex-shrink-0 text-gray-400" />{item.label}
            </Link>
          );
        }
        return (
          <button key={item.id} onClick={() => { setSection(item.id); onSelect?.(); }} className={cls}>
            <Icon className={`h-4 w-4 flex-shrink-0 ${active ? "text-[#FF5722]" : "text-gray-400"}`} />{item.label}
          </button>
        );
      })}
      <Separator className="my-2 bg-gray-200" />
      {isAdmin && (
        <Link to="/admin" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50">
          <LayoutDashboard className="h-4 w-4" /> Admin Panel
        </Link>
      )}
      <button onClick={handleSignOut} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50">
        <LogOut className="h-4 w-4" /> Logout
      </button>
    </div>
  );

  const Avatar = ({ size = 56 }: { size?: number }) => (
    <div className="relative" style={{ width: size, height: size }}>
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="w-full h-full rounded-full object-cover border border-gray-200" />
      ) : (
        <div className="w-full h-full rounded-full bg-[#0f172a] text-white flex items-center justify-center font-extrabold"
             style={{ fontSize: size * 0.32 }}>
          {initials}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container py-5 max-w-7xl">
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-4 font-medium">
          <Link to="/" className="hover:text-gray-600">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-700">Account</span>
        </nav>

        <div className="lg:hidden mb-4">
          <button onClick={() => setNavOpen(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm">
            <span className="font-semibold text-gray-900 text-sm">{activeLabel}</span>
            <ChevronRight className={`h-4 w-4 transition-transform ${navOpen ? "rotate-90" : ""}`} />
          </button>
          {navOpen && (
            <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-sm p-3">
              <NavList onSelect={() => setNavOpen(false)} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <aside className="hidden lg:block lg:col-span-3">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 sticky top-24">
              <NavList />
            </div>
          </aside>

          <div className="lg:col-span-9 space-y-5">
            {/* DASHBOARD */}
            {section === "dashboard" && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 md:p-6">
                <div className="flex items-center gap-4 mb-5">
                  <Avatar size={56} />
                  <div className="min-w-0">
                    <h2 className="font-bold text-gray-900 truncate">
                      Welcome back, {form.firstName || "there"}
                    </h2>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Orders", value: orders.length, icon: Package },
                    { label: "Total Spent", value: fmt(totalSpent), icon: CreditCard },
                    { label: "Wishlist", value: 0, icon: Heart },
                  ].map(s => (
                    <div key={s.label} className="text-center bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <s.icon className="h-5 w-5 mx-auto text-gray-400 mb-1.5" />
                      <p className="text-base md:text-lg font-extrabold text-gray-900">{s.value}</p>
                      <p className="text-[10px] text-gray-500">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PROFILE */}
            {section === "profile" && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900">Profile Information</h2>
                  <Button variant="outline" size="sm" onClick={() => setEditMode(!editMode)}
                    className="gap-2 border-gray-300 text-gray-700 text-xs font-semibold">
                    <Edit2 className="h-3.5 w-3.5" /> {editMode ? "Cancel" : "Edit"}
                  </Button>
                </div>
                <form onSubmit={handleSave} className="p-5 md:p-6 space-y-4">
                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <Avatar size={72} />
                    <div>
                      <input ref={fileRef} type="file" accept="image/*" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.currentTarget.value = ""; }} />
                      <Button type="button" variant="outline" size="sm" disabled={uploading}
                        onClick={() => fileRef.current?.click()} className="gap-2">
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                        {avatarUrl ? "Change photo" : "Upload photo"}
                      </Button>
                      <p className="text-[11px] text-gray-400 mt-1">JPG/PNG, auto-resized to 512px.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">First Name *</Label>
                      <Input className={inputCls} value={form.firstName}
                        onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                        disabled={!editMode} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Middle Name</Label>
                      <Input className={inputCls} value={form.middleName}
                        onChange={e => setForm(p => ({ ...p, middleName: e.target.value }))}
                        disabled={!editMode} placeholder="Optional" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Last Name *</Label>
                      <Input className={inputCls} value={form.lastName}
                        onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                        disabled={!editMode} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Email</Label>
                      <Input className={inputCls} value={form.email} disabled type="email" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Phone</Label>
                      <Input className={inputCls} value={form.phone}
                        onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                        disabled={!editMode} placeholder="+254 7XX XXX XXX" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Member Since</Label>
                      <Input className={inputCls} disabled
                        value={user?.created_at ? new Date(user.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"} />
                    </div>
                  </div>
                  {editMode && (
                    <div className="flex justify-end">
                      <Button type="submit" disabled={saving} className="bg-[#FF5722] hover:bg-[#e64a19] text-white font-bold px-6">
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                        Save Changes
                      </Button>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* ORDERS */}
            {section === "orders" && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="px-5 md:px-6 py-4 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900">Order History</h2>
                </div>
                <div className="p-5 md:p-6">
                  {ordersLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#FF5722]" /></div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                      <p className="font-semibold text-gray-700">No orders yet</p>
                      <Button asChild className="mt-3 bg-[#FF5722] hover:bg-[#e64a19] text-white font-bold">
                        <Link to="/">Start Shopping</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.map(o => {
                        const open = expandedOrder === o.id;
                        const items = orderItems[o.id];
                        const paymentMethod = (() => {
                          const m = o.notes?.match(/Payment:\s*([^.]+)\./);
                          return m ? m[1].trim() : "M-Pesa";
                        })();
                        const deliveryMethod = (() => {
                          const m = o.notes?.match(/Delivery:\s*(\w+)/);
                          return m ? m[1] : "Standard";
                        })();
                        const tax = Number(o.subtotal) * 0.16;
                        return (
                          <div key={o.id} className="border border-gray-200 rounded-xl overflow-hidden">
                            <button onClick={() => toggleOrder(o.id)}
                              className="w-full flex items-center justify-between p-3 md:p-4 gap-3 hover:bg-gray-50 transition-colors text-left">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Package className="h-5 w-5 text-[#FF5722]" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-900 text-sm truncate">{o.order_number}</p>
                                  <p className="text-xs text-gray-400">
                                    {new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span className={`text-[10px] md:text-xs font-semibold px-2 py-1 rounded-full border capitalize ${statusColor[o.status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                  {o.status}
                                </span>
                                <p className="font-bold text-gray-900 text-sm whitespace-nowrap">{fmt(Number(o.total))}</p>
                                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
                              </div>
                            </button>
                            {open && (
                              <div className="border-t border-gray-100 p-4 bg-gray-50/50 space-y-4">
                                {!items ? (
                                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-[#FF5722]" /></div>
                                ) : (
                                  <>
                                    <div className="space-y-2">
                                      {items.map(it => (
                                        <div key={it.id} className="flex items-center gap-3 bg-white rounded-lg p-2 border border-gray-100">
                                          <img src={it.product_image || "/placeholder.svg"} alt=""
                                            className="w-12 h-12 object-contain rounded border border-gray-100 flex-shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-900 line-clamp-2">{it.product_name}</p>
                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                              {it.quantity} × {fmt(Number(it.unit_price))}
                                            </p>
                                          </div>
                                          <span className="text-xs font-bold text-gray-900 flex-shrink-0">{fmt(Number(it.total_price))}</span>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-xs bg-white rounded-lg p-3 border border-gray-100">
                                      <Detail label="Subtotal" value={fmt(Number(o.subtotal))} />
                                      <Detail label="Delivery" value={fmt(Number(o.shipping_cost) || 0)} />
                                      <Detail label="Tax (16%)" value={fmt(tax)} />
                                      <Detail label="Total" value={fmt(Number(o.total))} bold />
                                      <Detail label="Payment" value={paymentMethod} />
                                      <Detail label="Delivery method" value={deliveryMethod} />
                                      <Detail label="Status" value={o.status} />
                                      <Detail label="Date" value={new Date(o.created_at).toLocaleString("en-GB")} />
                                    </div>
                                    {o.shipping_address && (
                                      <div className="text-xs bg-white rounded-lg p-3 border border-gray-100">
                                        <p className="font-semibold text-gray-700 mb-1">Shipping to</p>
                                        <p className="text-gray-600">
                                          {o.shipping_address.fullName}, {o.shipping_address.phone}<br />
                                          {o.shipping_address.address}{o.shipping_address.apartment ? `, ${o.shipping_address.apartment}` : ""}<br />
                                          {o.shipping_address.town}, {o.shipping_address.county}
                                        </p>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ADDRESSES */}
            {section === "address" && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 md:p-6">
                <AddressManager />
              </div>
            )}

            {/* PAYMENT METHODS */}
            {section === "payment" && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 md:p-6">
                <PaymentMethodsManager />
              </div>
            )}

            {/* SECURITY */}
            {section === "security" && (
              <div className="space-y-5">
                <form onSubmit={handleChangePassword} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 md:p-6 space-y-4">
                  <div>
                    <h2 className="font-bold text-gray-900">Change Password</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Use a strong password you haven't used elsewhere.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs text-gray-500">Current Password</Label>
                      <Input type="password" className={inputCls} value={pw.current}
                        onChange={e => setPw(p => ({ ...p, current: e.target.value }))} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">New Password</Label>
                      <Input type="password" className={inputCls} value={pw.next}
                        onChange={e => setPw(p => ({ ...p, next: e.target.value }))} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Confirm New Password</Label>
                      <Input type="password" className={inputCls} value={pw.confirm}
                        onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} required />
                    </div>
                  </div>
                  <Button type="submit" disabled={pwSaving} className="bg-[#FF5722] hover:bg-[#e64a19] text-white font-bold">
                    {pwSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Update Password
                  </Button>
                </form>

                <div className="bg-white border border-red-200 rounded-xl shadow-sm p-5 md:p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <h3 className="text-sm font-bold text-red-600">Danger Zone</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    Permanently delete your account and personal data. This action cannot be undone.
                  </p>
                  <Dialog open={delOpen} onOpenChange={setDelOpen}>
                    <DialogTrigger asChild>
                      <button className="border border-red-300 text-red-600 hover:bg-red-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                        <Trash2 className="h-4 w-4" /> Delete Account
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete your account?</DialogTitle>
                        <DialogDescription>
                          This is permanent. Your profile, cart, wishlist and account will be removed.
                          Past orders will be anonymised for accounting records.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <Label className="text-xs text-gray-500">Confirm with your password</Label>
                        <Input type="password" className={inputCls} value={delPwd}
                          onChange={e => setDelPwd(e.target.value)} placeholder="Your password" />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDelOpen(false)} disabled={delLoading}>Cancel</Button>
                        <Button onClick={handleDeleteAccount} disabled={delLoading || !delPwd}
                          className="bg-red-600 hover:bg-red-700 text-white">
                          {delLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                          Permanently Delete
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const Detail = ({ label, value, bold }: { label: string; value: any; bold?: boolean }) => (
  <div className="flex justify-between gap-3">
    <span className="text-gray-500">{label}</span>
    <span className={`text-gray-800 capitalize text-right ${bold ? "font-extrabold" : "font-semibold"}`}>{value}</span>
  </div>
);

// ── Image compression helper ──
async function compressImage(file: File, maxDim = 512, quality = 0.85): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = URL.createObjectURL(file);
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", quality)
  );
}

export default Account;
