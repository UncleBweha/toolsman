import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCartContext } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Heart, ShoppingCart, Trash2, Check, Loader2,
  Share2, ChevronRight, Package, ShieldCheck, Truck, Headset
} from "lucide-react";

interface WishlistItem {
  id: string;
  product_id: string;
  created_at: string;
  product?: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    slug: string;
    sku: string | null;
  };
}

const Wishlist = () => {
  const { user } = useAuth();
  const { addToCart } = useCartContext();
  const { toast } = useToast();

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addingAll, setAddingAll] = useState(false);

  const fmt = (n: number) => `Kshs ${Number(n).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;

  const fetchWishlist = async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("wishlists")
      .select("*, product:products(id, name, price, image_url, slug, sku)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setItems((data as WishlistItem[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchWishlist(); }, [user]);

  const removeItem = async (id: string) => {
    await supabase.from("wishlists").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
    toast({ title: "Removed from wishlist" });
  };

  const handleAddToCart = async (item: WishlistItem) => {
    if (!item.product_id) return;
    const { error } = await addToCart(item.product_id, 1);
    if (!error) toast({ title: "Added to cart!", description: item.product?.name });
  };

  const handleMoveAllToCart = async () => {
    setAddingAll(true);
    for (const item of items) {
      await addToCart(item.product_id, 1);
    }
    setAddingAll(false);
    toast({ title: `${items.length} items added to cart!` });
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map(i => i.id)));
  };

  const estimatedTotal = items.reduce((sum, i) => sum + (i.product?.price || 0), 0);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <Heart className="h-16 w-16 mx-auto text-gray-200 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Wishlist</h1>
          <p className="text-gray-500 mb-6">Sign in to save and view your wishlist</p>
          <Button asChild className="bg-[#FF5722] hover:bg-[#e64a19] text-white font-bold">
            <Link to="/auth">Sign In</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container py-6 max-w-7xl">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-5 font-medium">
          <Link to="/account" className="hover:text-gray-600">My Account</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-700">Wishlist</span>
        </nav>

        <div className="grid lg:grid-cols-12 gap-6">

          {/* ── Main List ── */}
          <div className="lg:col-span-9 space-y-4">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900">
                  My Wishlist ({loading ? "…" : items.length})
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">Items you've saved for later.</p>
              </div>
              {items.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2 border-gray-300 text-gray-600 text-xs font-semibold">
                    <Share2 className="h-3.5 w-3.5" /> Share Wishlist
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleMoveAllToCart}
                    disabled={addingAll}
                    className="gap-2 bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-bold"
                  >
                    {addingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                    Move All to Cart
                  </Button>
                </div>
              )}
            </div>

            {/* Loading */}
            {loading && (
              <div className="bg-white border border-gray-200 rounded-xl p-16 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#FF5722]" />
              </div>
            )}

            {/* Empty */}
            {!loading && items.length === 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
                <Heart className="h-14 w-14 mx-auto text-gray-200 mb-4" />
                <h2 className="text-lg font-bold text-gray-900 mb-1">Your wishlist is empty</h2>
                <p className="text-sm text-gray-400 mb-6">Browse products and click the heart icon to save items here</p>
                <Button asChild className="bg-[#FF5722] hover:bg-[#e64a19] text-white font-bold">
                  <Link to="/">Start Shopping</Link>
                </Button>
              </div>
            )}

            {/* Items list */}
            {!loading && items.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {/* Table header */}
                <div className="hidden md:flex items-center gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-3 w-6">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 accent-[#FF5722]"
                      checked={selected.size === items.length && items.length > 0}
                      onChange={selectAll}
                    />
                  </div>
                  <div className="flex-1">Product</div>
                  <div className="w-28 text-right">Price</div>
                  <div className="w-32 text-center">Action</div>
                  <div className="w-8"></div>
                </div>

                <div className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <div key={item.id} className="flex flex-col md:flex-row md:items-center gap-4 p-5">
                      {/* Checkbox */}
                      <div className="hidden md:block w-6 flex-shrink-0">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 accent-[#FF5722]"
                          checked={selected.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                        />
                      </div>

                      {/* Product info */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <Link to={`/product/${item.product?.slug}`} className="flex-shrink-0">
                          <div className="w-20 h-20 border border-gray-200 rounded-xl flex items-center justify-center bg-white overflow-hidden">
                            <img
                              src={item.product?.image_url || "/placeholder.svg"}
                              alt={item.product?.name}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        </Link>
                        <div className="min-w-0">
                          <Link
                            to={`/product/${item.product?.slug}`}
                            className="font-bold text-gray-900 text-sm hover:text-[#FF5722] transition-colors line-clamp-2 block"
                          >
                            {item.product?.name}
                          </Link>
                          <p className="text-xs text-gray-400 mt-1 uppercase">SKU: {item.product?.sku || "N/A"}</p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Check className="h-3 w-3 text-green-500" />
                            <span className="text-xs font-semibold text-green-600">
                              In Stock
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="md:w-28 md:text-right flex justify-between md:block">
                        <span className="md:hidden text-xs text-gray-400 font-medium">Price</span>
                        <span className="font-extrabold text-gray-900 text-base">
                          {fmt(item.product?.price || 0)}
                        </span>
                      </div>

                      {/* Add to cart */}
                      <div className="md:w-32 flex justify-center">
                        <Button
                          size="sm"
                          onClick={() => handleAddToCart(item)}
                          className="gap-1.5 bg-white border border-gray-300 text-gray-700 hover:border-[#FF5722] hover:text-[#FF5722] text-xs font-semibold shadow-none w-full md:w-auto"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          Add to Cart
                        </Button>
                      </div>

                      {/* Remove */}
                      <div className="md:w-8 flex justify-end">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs text-gray-400">Showing 1 to {items.length} of {items.length} items</p>
                </div>
              </div>
            )}

            {/* Trust badges */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {[
                  { icon: Truck, label: "Nationwide Delivery", sub: "Fast & reliable" },
                  { icon: ShieldCheck, label: "Quality Guarantee", sub: "Pro-grade tools" },
                  { icon: Package, label: "Secure Payment", sub: "100% protected" },
                  { icon: Headset, label: "Customer Support", sub: "We're here to help" },
                ].map(b => (
                  <div key={b.label} className="flex items-center gap-3">
                    <b.icon className="h-7 w-7 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-900 leading-tight">{b.label}</p>
                      <p className="text-[10px] text-gray-400">{b.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div className="lg:col-span-3 space-y-5">
            {/* Wishlist Summary */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 sticky top-24">
              <h3 className="font-bold text-gray-900 mb-4">Wishlist Summary</h3>
              <div className="space-y-3 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Items</span>
                  <span className="font-bold text-gray-900">{items.length}</span>
                </div>
              </div>
              <Separator className="my-4 bg-gray-100" />
              <div className="mb-6">
                <p className="text-xs text-gray-400 mb-1">Est. Total Value</p>
                <p className="text-2xl font-extrabold text-gray-900">{fmt(estimatedTotal)}</p>
                <p className="text-[10px] text-gray-400 mt-1">Prices and availability are subject to change.</p>
              </div>

              <Button
                onClick={handleMoveAllToCart}
                disabled={addingAll || items.length === 0}
                className="w-full bg-[#FF5722] hover:bg-[#e64a19] text-white font-bold h-11 mb-3"
              >
                {addingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
                Move All to Cart
              </Button>

              <Button variant="outline" className="w-full border-gray-300 text-gray-700 font-semibold gap-2">
                <Share2 className="h-4 w-4" /> Share Wishlist
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Wishlist;
