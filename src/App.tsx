import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { Loader2 } from "lucide-react";

// Eagerly-loaded critical routes
import Index from "./pages/Index";
import Product from "./pages/Product";
import Category from "./pages/Category";
import Products from "./pages/Products";
import Search from "./pages/Search";
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrollToTop";
import ConditionalWhatsAppButton from "./components/ConditionalWhatsAppButton";
import BottomNav from "./components/layout/BottomNav";

// Lazily-loaded routes (non-critical, reduces initial bundle)
const Auth = lazy(() => import("./pages/Auth"));
const Account = lazy(() => import("./pages/Account"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Admin = lazy(() => import("./pages/Admin"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQs = lazy(() => import("./pages/FAQs"));
const ShippingPolicy = lazy(() => import("./pages/ShippingPolicy"));
const ReturnPolicy = lazy(() => import("./pages/ReturnPolicy"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-[#FF5722]" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 45 * 1000, // 45 seconds before refetch
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <ConditionalWhatsAppButton phoneNumber="254701043041" />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/account" element={<Account />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/product/:slug" element={<Product />} />
                <Route path="/category/:slug" element={<Category />} />
                <Route path="/products" element={<Products />} />
                <Route path="/search" element={<Search />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/deals" element={<Products />} />
                <Route path="/new-arrivals" element={<Products />} />
                <Route path="/best-sellers" element={<Products />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/faqs" element={<FAQs />} />
                <Route path="/shipping-policy" element={<ShippingPolicy />} />
                <Route path="/return-policy" element={<ReturnPolicy />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/admin/*" element={<Admin />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <BottomNav />
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
