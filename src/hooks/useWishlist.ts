import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useWishlist = () => {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const fetchWishlist = useCallback(async () => {
    if (!user) {
      setIds(new Set());
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("wishlists")
      .select("product_id")
      .eq("user_id", user.id);
    setIds(new Set((data || []).map((r: any) => r.product_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  // Listen to global wishlist updates so badges/cards stay in sync
  useEffect(() => {
    const handler = () => fetchWishlist();
    window.addEventListener("wishlist:changed", handler);
    return () => window.removeEventListener("wishlist:changed", handler);
  }, [fetchWishlist]);

  const toggle = async (productId: string): Promise<{ added: boolean } | null> => {
    if (!user) return null;
    if (ids.has(productId)) {
      await supabase.from("wishlists").delete().eq("user_id", user.id).eq("product_id", productId);
      const next = new Set(ids);
      next.delete(productId);
      setIds(next);
      window.dispatchEvent(new Event("wishlist:changed"));
      return { added: false };
    } else {
      await supabase.from("wishlists").insert({ user_id: user.id, product_id: productId });
      const next = new Set(ids);
      next.add(productId);
      setIds(next);
      window.dispatchEvent(new Event("wishlist:changed"));
      return { added: true };
    }
  };

  return { ids, count: ids.size, isInWishlist: (id: string) => ids.has(id), toggle, loading, refetch: fetchWishlist };
};
