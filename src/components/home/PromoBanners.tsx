import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Loader2, Tag } from "lucide-react";
import { getProductAlt } from "@/lib/imageUtils";
import OptimizedImage from "@/components/OptimizedImage";

const fmt = (n: number) => `KSh ${Number(n).toLocaleString("en-US")}`;

const PromoBanners = () => {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["promo-banners"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, original_price, image_url")
        .eq("is_active", true)
        .not("original_price", "is", null)
        .order("created_at", { ascending: false })
        .limit(8);
      return (data || []).filter((p) => p.original_price && p.original_price > p.price).slice(0, 4);
    },
  });

  if (isLoading) {
    return (
      <section className="py-4 md:py-8 bg-white">
        <div className="container flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      </section>
    );
  }

  if (!products.length) return null;

  return (
    <section className="py-4 md:py-8 bg-white">
      <div className="container">
        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-[#FF5722]" />
            <h2 className="text-base md:text-xl font-bold text-gray-900">Hot Deals</h2>
          </div>
          <Link
            to="/deals"
            className="text-xs text-[#FF5722] font-semibold hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Uniform 4-column deal cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {products.map((p) => {
            const discount = Math.round(
              ((p.original_price! - p.price) / p.original_price!) * 100
            );
            return (
              <Link
                key={p.id}
                to={`/product/${p.slug}`}
                className="group flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Image */}
                <div className="relative bg-gray-50 aspect-square overflow-hidden">
                  <span className="absolute top-2 left-2 z-10 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    -{discount}%
                  </span>
                  {p.image_url && (
                    <OptimizedImage
                      src={p.image_url}
                      alt={getProductAlt(p.name)}
                      width={300}
                      height={300}
                      className="w-full h-full object-contain p-3 group-hover:scale-[1.03] transition-transform duration-300"
                    />
                  )}
                </div>

                {/* Info */}
                <div className="p-3 flex flex-col gap-1 flex-1">
                  <h3 className="text-xs md:text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                    {p.name}
                  </h3>
                  <div className="mt-auto pt-2">
                    <p className="text-sm font-extrabold text-gray-900">{fmt(p.price)}</p>
                    <p className="text-[11px] text-gray-400 line-through">{fmt(p.original_price!)}</p>
                  </div>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs text-[#FF5722] font-semibold group-hover:underline">
                    Shop Now <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PromoBanners;
