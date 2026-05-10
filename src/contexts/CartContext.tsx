import { createContext, useContext, ReactNode } from "react";
import { useCart } from "@/hooks/useCart";
import { CartItem } from "@/types/database";

interface CartContextType {
  cartItems: CartItem[];
  cartCount: number;
  cartTotal: number;
  isLoading: boolean;
  addToCart: (productId: string, quantity?: number) => Promise<{ error: Error | null }>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<{ error: Error | null }>;
  removeFromCart: (cartItemId: string) => Promise<{ error: Error | null }>;
  clearCart: () => Promise<void>;
  refetch: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const cart = useCart();

  return (
    <CartContext.Provider value={cart}>
      {children}
    </CartContext.Provider>
  );
};

export const useCartContext = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCartContext must be used within a CartProvider");
  }
  return context;
};
