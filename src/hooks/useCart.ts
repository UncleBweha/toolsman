import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CartItem, Product } from "@/types/database";
import { useToast } from "@/hooks/use-toast";

// Admin accounts are restricted from placing orders

const GUEST_CART_KEY = "toolsman_guest_cart";

interface GuestCartItem {
  id: string;
  product_id: string;
  quantity: number;
  product?: Product;
}

const generateId = () => crypto.randomUUID();

const getGuestCart = (): GuestCartItem[] => {
  try {
    const stored = localStorage.getItem(GUEST_CART_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveGuestCart = (items: GuestCartItem[]) => {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
};

const clearGuestCart = () => {
  localStorage.removeItem(GUEST_CART_KEY);
};

export const useCart = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch product details for guest cart items
  const enrichGuestCart = async (guestItems: GuestCartItem[]): Promise<CartItem[]> => {
    if (guestItems.length === 0) return [];

    const productIds = guestItems.map(item => item.product_id);
    const { data: products } = await supabase
      .from("products")
      .select("*")
      .in("id", productIds);

    return guestItems.map(item => ({
      ...item,
      user_id: "guest",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      product: products?.find(p => p.id === item.product_id) as Product | undefined
    }));
  };

  // Sync guest cart to database when user logs in
  const syncGuestCartToDatabase = async (userId: string) => {
    const guestItems = getGuestCart();
    if (guestItems.length === 0) return;

    for (const item of guestItems) {
      // Check if item already exists in user's cart
      const { data: existing } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", userId)
        .eq("product_id", item.product_id)
        .single();

      if (existing) {
        // Update quantity
        await supabase
          .from("cart_items")
          .update({ quantity: existing.quantity + item.quantity })
          .eq("id", existing.id);
      } else {
        // Insert new item
        await supabase
          .from("cart_items")
          .insert({
            user_id: userId,
            product_id: item.product_id,
            quantity: item.quantity
          });
      }
    }

    clearGuestCart();
  };

  const fetchCartItems = useCallback(async () => {
    setIsLoading(true);

    if (user) {
      // Sync guest cart first if user just logged in
      await syncGuestCartToDatabase(user.id);

      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          *,
          product:products(*)
        `)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching cart:", error);
      } else {
        setCartItems(data || []);
      }
    } else {
      // Guest user - use localStorage
      const guestItems = getGuestCart();
      const enrichedItems = await enrichGuestCart(guestItems);
      setCartItems(enrichedItems);
    }

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCartItems();
  }, [fetchCartItems]);

  const addToCart = async (productId: string, quantity: number = 1) => {
    // Block admin accounts from placing orders
    if (isAdmin) {
      toast({
        title: "Action Restricted",
        description: "Admin accounts cannot place orders. Use a regular customer account to shop.",
        variant: "destructive",
      });
      return { error: new Error("Admin accounts cannot place orders") };
    }

    if (user) {
      // Authenticated user - use database
      const existingItem = cartItems.find(item => item.product_id === productId);

      if (existingItem) {
        return updateQuantity(existingItem.id, existingItem.quantity + quantity);
      }

      const { error } = await supabase
        .from("cart_items")
        .insert({
          user_id: user.id,
          product_id: productId,
          quantity
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add item to cart",
          variant: "destructive",
        });
        return { error };
      }
    } else {
      // Guest user - use localStorage
      const guestItems = getGuestCart();
      const existingIndex = guestItems.findIndex(item => item.product_id === productId);

      if (existingIndex >= 0) {
        guestItems[existingIndex].quantity += quantity;
      } else {
        guestItems.push({
          id: generateId(),
          product_id: productId,
          quantity
        });
      }

      saveGuestCart(guestItems);
    }

    toast({
      title: "Added to cart",
      description: "Item has been added to your cart",
    });

    await fetchCartItems();
    return { error: null };
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    if (quantity < 1) {
      return removeFromCart(cartItemId);
    }

    if (user) {
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity })
        .eq("id", cartItemId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update quantity",
          variant: "destructive",
        });
        return { error };
      }
    } else {
      // Guest user
      const guestItems = getGuestCart();
      const itemIndex = guestItems.findIndex(item => item.id === cartItemId);
      if (itemIndex >= 0) {
        guestItems[itemIndex].quantity = quantity;
        saveGuestCart(guestItems);
      }
    }

    await fetchCartItems();
    return { error: null };
  };

  const removeFromCart = async (cartItemId: string) => {
    if (user) {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", cartItemId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to remove item",
          variant: "destructive",
        });
        return { error };
      }
    } else {
      // Guest user
      const guestItems = getGuestCart();
      const filtered = guestItems.filter(item => item.id !== cartItemId);
      saveGuestCart(filtered);
    }

    toast({
      title: "Removed",
      description: "Item has been removed from your cart",
    });

    await fetchCartItems();
    return { error: null };
  };

  const clearCart = async () => {
    if (user) {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", user.id);

      if (!error) {
        setCartItems([]);
      }
    } else {
      clearGuestCart();
      setCartItems([]);
    }
  };

  const cartTotal = cartItems.reduce((total, item) => {
    const price = item.product?.price || 0;
    return total + (price * item.quantity);
  }, 0);

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  return {
    cartItems,
    cartCount,
    cartTotal,
    isLoading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    refetch: fetchCartItems
  };
};
