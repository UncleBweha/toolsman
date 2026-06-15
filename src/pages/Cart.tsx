import { Link } from "react-router-dom";
import { useCartContext } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2, ShoppingBag, Loader2, Check, Heart, ChevronLeft, Truck, ShieldCheck, Award, Lock } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const Cart = () => {
  const { cartItems, cartTotal, isLoading, updateQuantity, removeFromCart, cartCount } = useCartContext();
  const { user, isAdmin } = useAuth();

  const formatPrice = (amount: number) => {
    return `Kshs ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
  };

  const tax = cartTotal * 0.16; // 16% VAT approximation for display
  const finalTotal = cartTotal + tax;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF5722]" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 container py-8">
        
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Shopping Cart <span className="text-gray-500 text-xl font-medium">({cartCount})</span>
          </h1>
          <Link to="/" className="hidden md:flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Continue Shopping
          </Link>
        </div>

        {cartItems.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-100">
            <ShoppingBag className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">
              Looks like you haven't added anything to your cart yet
            </p>
            <Button asChild className="bg-[#FF5722] hover:bg-[#e64a19] text-white">
              <Link to="/">Start Shopping</Link>
            </Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
                {/* Table Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100 bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <div className="col-span-5">Product</div>
                  <div className="col-span-2 text-center">Price</div>
                  <div className="col-span-2 text-center">Quantity</div>
                  <div className="col-span-2 text-center">Subtotal</div>
                  <div className="col-span-1 text-right">Action</div>
                </div>

                {/* Cart Items */}
                <div className="divide-y divide-gray-100">
                  {cartItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-6 items-center">
                      {/* Product */}
                      <div className="md:col-span-5 flex gap-4">
                        <div className="w-20 h-20 bg-white border border-gray-200 rounded-lg p-1 flex-shrink-0 flex items-center justify-center">
                          <img
                            src={item.product?.image_url || "/placeholder.svg"}
                            alt={item.product?.name || "Product"}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <div className="flex flex-col justify-center">
                          <Link 
                            to={`/product/${item.product?.slug}`}
                            className="font-semibold text-gray-900 text-sm hover:text-[#FF5722] transition-colors line-clamp-2"
                          >
                            {item.product?.name}
                          </Link>
                          <span className="text-xs text-gray-500 mt-1 uppercase">
                            SKU: {item.product?.sku || `TM-${item.product_id?.slice(0, 5).toUpperCase()}`}
                          </span>
                          <div className="flex items-center gap-1 text-green-600 text-xs font-semibold mt-2">
                            <Check className="h-3 w-3" /> In Stock
                          </div>
                        </div>
                      </div>

                      {/* Price (Mobile & Desktop) */}
                      <div className="md:col-span-2 md:text-center font-bold text-gray-900 flex justify-between md:block">
                        <span className="md:hidden text-gray-500 font-medium text-sm">Price:</span>
                        {formatPrice(item.product?.price || 0)}
                      </div>

                      {/* Quantity */}
                      <div className="md:col-span-2 flex md:justify-center">
                        <div className="flex items-center border border-gray-300 rounded-md bg-white w-24">
                          <button 
                            className="flex-1 h-8 flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="flex-1 h-8 flex items-center justify-center text-sm font-semibold border-x border-gray-300">
                            {item.quantity}
                          </span>
                          <button 
                            className="flex-1 h-8 flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Subtotal */}
                      <div className="md:col-span-2 md:text-center font-bold text-gray-900 flex justify-between md:block">
                        <span className="md:hidden text-gray-500 font-medium text-sm">Subtotal:</span>
                        {formatPrice((item.product?.price || 0) * item.quantity)}
                      </div>

                      {/* Action */}
                      <div className="md:col-span-1 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 md:gap-2 text-xs font-medium text-gray-500 pt-2 md:pt-0 border-t md:border-0 border-gray-100 mt-2 md:mt-0">
                        <button 
                          className="flex items-center gap-1 hover:text-red-600 transition-colors"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> <span className="hidden md:inline">Remove</span>
                        </button>
                        <button className="flex items-center gap-1 hover:text-[#FF5722] transition-colors">
                          <Heart className="h-3.5 w-3.5" /> <span className="hidden md:inline">Move to Wishlist</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust Badges Bar */}
              <div className="mt-6 bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 text-center md:text-left">
                <div className="flex items-center gap-3">
                  <Truck className="h-8 w-8 text-gray-400 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 leading-tight">NATIONWIDE DELIVERY</h4>
                    <p className="text-xs text-gray-500">Fast & reliable shipping</p>
                  </div>
                </div>
                <div className="hidden md:block w-px h-10 bg-gray-200"></div>
                <div className="flex items-center gap-3">
                  <Award className="h-8 w-8 text-gray-400 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 leading-tight">QUALITY GUARANTEE</h4>
                    <p className="text-xs text-gray-500">Pro-grade tools only</p>
                  </div>
                </div>
                <div className="hidden md:block w-px h-10 bg-gray-200"></div>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-8 w-8 text-gray-400 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 leading-tight">SECURE PAYMENT</h4>
                    <p className="text-xs text-gray-500">100% protected checkout</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4">
              <Card className="border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.03)] rounded-xl sticky top-24">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Order Summary</h3>
                  
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Subtotal ({cartCount} items)</span>
                      <span className="font-bold text-gray-900">{formatPrice(cartTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Shipping</span>
                      <span className="font-bold text-gray-900">Calculated at checkout</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Tax (16% Est.)</span>
                      <span className="font-bold text-gray-900">{formatPrice(tax)}</span>
                    </div>
                  </div>

                  <Separator className="my-6 bg-gray-200" />
                  
                  <div className="flex justify-between items-end mb-6">
                    <span className="text-base font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-gray-900">{formatPrice(finalTotal)}</span>
                  </div>

                  <div className="bg-green-50 border border-green-100 rounded-lg p-3 mb-6 flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-green-800 font-medium leading-tight">
                      You're eligible for our nationwide secure delivery network!
                    </p>
                  </div>

                  {isAdmin ? (
                    <div className="text-center">
                      <p className="text-sm text-red-600 font-semibold mb-2">Admin accounts cannot place orders</p>
                      <Button className="w-full" variant="outline" asChild>
                        <Link to="/admin">Go to Admin Panel</Link>
                      </Button>
                    </div>
                  ) : (
                    <Button className="w-full bg-[#FF5722] hover:bg-[#e64a19] text-white h-12 font-bold text-sm shadow-none" asChild>
                      <Link to="/checkout">
                        <Lock className="h-4 w-4 mr-2" />
                        PROCEED TO CHECKOUT
                      </Link>
                    </Button>
                  )}

                  <div className="mt-8">
                    <p className="text-xs font-semibold text-gray-500 mb-3 text-center">We Accept</p>
                    <div className="flex items-center justify-center gap-2">
                      {/* Fake Payment Icons */}
                      <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs font-bold text-blue-800 italic">VISA</div>
                      <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs font-bold text-red-500">MasterCard</div>
                      <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs font-bold text-green-600">M-PESA</div>
                      <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs font-bold text-blue-600 italic">PayPal</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Cart;
