import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Loader2 } from "lucide-react";
import { useState, useCallback } from "react";
import { useCartContext } from "@/contexts/CartContext";
import { useWishlist } from "@/hooks/useWishlist";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getProxiedImageUrl } from "@/lib/imageUtils";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface ProductCardProps {
  id?: number;
  productId?: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  image: string;
  discount?: number;
  slug?: string;
}

const ProductCard = ({ id, productId, name, price, originalPrice, image, discount, slug }: ProductCardProps) => {
  const { addToCart } = useCartContext();
  const { isInWishlist, toggle } = useWishlist();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const queryClient = useQueryClient();

  // Prefetch product page data on hover for instant navigation
  const handlePrefetch = useCallback(() => {
    if (!slug) return;
    queryClient.prefetchQuery({
      queryKey: ["product", slug],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("products")
          .select("*, category:categories(name, slug)")
          .eq("slug", slug)
          .maybeSingle();
        if (error) throw error;
        return data;
      },
      staleTime: 60 * 1000,
    });
  }, [slug, queryClient]);

  const formatPrice = (amount: number) =>
    `KSh ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;

  const calculateDiscount = () => {
    if (discount) return discount;
    if (originalPrice && originalPrice > price) {
      return Math.round(((originalPrice - price) / originalPrice) * 100);
    }
    return 0;
  };

  const discountPercent = calculateDiscount();
  const productLink = slug ? `/product/${slug}` : `/product/${id}`;
  const proxiedImage = getProxiedImageUrl(image);
  const wished = productId ? isInWishlist(productId) : false;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!productId || adding) return;
    setAdding(true);
    await addToCart(productId);
    setAdding(false);
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!productId) return;
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to save items." });
      navigate("/auth");
      return;
    }
    const res = await toggle(productId);
    if (res) {
      toast({ title: res.added ? "Added to wishlist" : "Removed from wishlist" });
    }
  };

  return (
    <div
      className="bg-white rounded-xl p-3 shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-gray-100 hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full relative"
      onMouseEnter={handlePrefetch}
    >
      <Link to={productLink} className="block">
        {/* Image container */}
        <div className="relative w-full aspect-square bg-white rounded-lg overflow-hidden mb-2.5">
          {discountPercent > 0 && (
            <span className="absolute top-1.5 left-1.5 z-10 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              -{discountPercent}%
            </span>
          )}
          <button
            type="button"
            onClick={handleWishlist}
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            className={cn(
              "absolute top-1.5 right-1.5 z-10 h-7 w-7 rounded-full flex items-center justify-center bg-white/95 shadow-sm border border-gray-100 transition-colors",
              wished ? "text-red-500" : "text-gray-400 hover:text-red-500"
            )}
          >
            <Heart className={cn("h-3.5 w-3.5", wished && "fill-current")} />
          </button>
          <img
            src={proxiedImage}
            alt={name}
            width={400}
            height={400}
            loading="lazy"
            className="w-full h-full object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = "/placeholder.svg";
            }}
          />
        </div>
      </Link>

      <div className="flex flex-col flex-grow gap-1">
        <Link to={productLink} className="block">
          <h3 className="text-xs sm:text-sm font-medium text-gray-900 line-clamp-2 leading-snug min-h-[2.5em] hover:text-[#FF5722] transition-colors">
            {name}
          </h3>
        </Link>

        <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
          <span className="text-sm sm:text-base font-bold text-[#FF5722]">
            {formatPrice(price)}
          </span>
          {originalPrice && originalPrice > price && (
            <span className="text-[11px] text-gray-400 line-through">
              {formatPrice(originalPrice)}
            </span>
          )}
        </div>

        <button
          onClick={handleAddToCart}
          disabled={!productId || adding}
          className="mt-auto w-full bg-[#FF5722] hover:bg-[#e64a19] active:scale-[0.98] disabled:opacity-50 text-white font-bold rounded-lg text-[11px] sm:text-xs py-2 md:py-2.5 transition-all duration-200 flex items-center justify-center gap-1.5 md:opacity-0 md:group-hover:opacity-100"
        >
          {adding ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <ShoppingCart className="h-3.5 w-3.5" />
              Add to Cart
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
