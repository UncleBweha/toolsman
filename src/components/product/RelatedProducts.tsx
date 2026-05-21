import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/database";
import { Link } from "react-router-dom";
import { ShoppingCart, Loader2 } from "lucide-react";
import { getProxiedImageUrl } from "@/lib/imageUtils";
import { useCartContext } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface RelatedProductsProps {
  currentProductId: string;
  tags?: string[];
  generatedTags?: string[];
  categoryId?: string | null;
  productName?: string;
}

const formatPrice = (amount: number) =>
  `KSh ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;

/** Score a candidate product by how many tags it shares with the current product */
function scoreProduct(
  candidate: Product,
  currentTags: string[],
  categoryId: string | null | undefined
): number {
  const candidateTags = [...(candidate.tags ?? []), ...(candidate.generated_tags ?? [])].map((t) =>
    t.toLowerCase().trim()
  );
  const tagIntersection = currentTags.filter((t) =>
    candidateTags.includes(t.toLowerCase().trim())
  ).length;
  const categoryBonus = candidate.category_id === categoryId ? 2 : 0;
  // Small random jitter for variety on each visit
  const jitter = Math.random() * 0.5;
  return tagIntersection + categoryBonus + jitter;
}

const RelatedProductCard = ({ product }: { product: Product }) => {
  const { addToCart } = useCartContext();
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAdding(true);
    await addToCart(product.id);
    toast({ title: "Added to cart", description: product.name });
    setAdding(false);
  };

  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col"
    >
      {/* Image */}
      <div className="relative aspect-square bg-white overflow-hidden">
        {discount > 0 && (
          <span className="absolute top-1.5 left-1.5 z-10 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            -{discount}%
          </span>
        )}
        <img
          src={getProxiedImageUrl(product.image_url || "/placeholder.svg")}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            const t = e.target as HTMLImageElement;
            t.onerror = null;
            t.src = "/placeholder.svg";
          }}
        />
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1 gap-2">
        <h3 className="text-xs font-semibold text-gray-900 line-clamp-2 leading-snug min-h-[2.4em] group-hover:text-[#FF5722] transition-colors">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-1.5 flex-wrap mt-auto">
          <span className="text-sm font-extrabold text-[#FF5722]">
            {formatPrice(product.price)}
          </span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-[10px] text-gray-400 line-through">
              {formatPrice(product.original_price)}
            </span>
          )}
        </div>
        <button
          onClick={handleAddToCart}
          disabled={adding}
          className="w-full bg-[#FF5722] hover:bg-[#e64a19] disabled:opacity-50 text-white font-bold rounded-lg text-[11px] py-2 transition-colors flex items-center justify-center gap-1.5 mt-1"
        >
          {adding ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <ShoppingCart className="h-3 w-3" />
              Add to Cart
            </>
          )}
        </button>
      </div>
    </Link>
  );
};

// Skeleton loader card
const SkeletonCard = () => (
  <div className="bg-white border border-gray-100 rounded-xl overflow-hidden animate-pulse">
    <div className="aspect-square bg-gray-100" />
    <div className="p-3 space-y-2">
      <div className="h-3 bg-gray-100 rounded w-full" />
      <div className="h-3 bg-gray-100 rounded w-2/3" />
      <div className="h-4 bg-gray-100 rounded w-1/2 mt-2" />
      <div className="h-7 bg-gray-100 rounded mt-2" />
    </div>
  </div>
);

const RelatedProducts = ({
  currentProductId,
  tags = [],
  generatedTags = [],
  categoryId,
  productName = "",
}: RelatedProductsProps) => {
  const allCurrentTags = [...tags, ...generatedTags].map((t) => t.toLowerCase().trim());

  const { data: candidates, isLoading } = useQuery({
    queryKey: ["related-products", currentProductId, categoryId, allCurrentTags.join(",")],
    queryFn: async () => {
      // Fetch products in same category + products with matching tags
      const queries: Promise<Product[]>[] = [];

      // 1. Same category
      if (categoryId) {
        queries.push(
          supabase
            .from("products")
            .select("*")
            .eq("category_id", categoryId)
            .eq("is_active", true)
            .neq("id", currentProductId)
            .limit(30)
            .then(({ data }) => (data as unknown as Product[]) ?? [])
        );
      }

      // 2. Products with overlapping tags (if we have tags)
      if (allCurrentTags.length > 0) {
        queries.push(
          supabase
            .from("products")
            .select("*")
            .eq("is_active", true)
            .neq("id", currentProductId)
            .overlaps("tags", allCurrentTags)
            .limit(30)
            .then(({ data }) => (data as unknown as Product[]) ?? [])
        );

        queries.push(
          supabase
            .from("products")
            .select("*")
            .eq("is_active", true)
            .neq("id", currentProductId)
            .overlaps("generated_tags", allCurrentTags)
            .limit(30)
            .then(({ data }) => (data as unknown as Product[]) ?? [])
        );
      }

      if (queries.length === 0) return [];

      const results = await Promise.all(queries);
      const merged = results.flat();

      // Deduplicate by id
      const seen = new Set<string>();
      const unique = merged.filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });

      // Score + sort
      const scored = unique.map((p) => ({ p, score: scoreProduct(p, allCurrentTags, categoryId) }));
      scored.sort((a, b) => b.score - a.score);

      return scored.map((s) => s.p).slice(0, 8);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!currentProductId,
  });

  // Don't render section if nothing to show and not loading
  if (!isLoading && (!candidates || candidates.length === 0)) return null;

  return (
    <section className="mt-12 md:mt-16">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Related Products</h2>
        <span className="text-xs text-gray-400">{candidates?.length ?? 0} products</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : candidates!.map((product) => (
              <RelatedProductCard key={product.id} product={product} />
            ))}
      </div>
    </section>
  );
};

export default RelatedProducts;
