import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Loader2 } from "lucide-react";
import { getProxiedImageUrl } from "@/lib/imageUtils";

const fmt = (n: number) => `KSh ${Number(n).toLocaleString("en-US")}`;

const PromoBanners = () => {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["promo-banners"],
    queryFn: async () => {
      // Pick newest discounted products
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
      <section className="py-8 md:py-12 bg-background">
        <div className="container flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (!products.length) return null;

  return (
    <section className="py-4 md:py-10 bg-background">
      <div className="container">
        <h2 className="text-base md:text-2xl font-bold text-foreground mb-3 md:mb-5">Hot Deals</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-5">
          {products.map((p, i) => {
            const accent = i === 0;
            const discount = Math.round(((p.original_price! - p.price) / p.original_price!) * 100);
            return (
              <Link
                key={p.id}
                to={`/product/${p.slug}`}
                className={`relative rounded-2xl p-4 md:p-5 transition-all hover:-translate-y-1 overflow-hidden border border-border shadow-sm hover:shadow-md ${
                  accent ? "bg-primary text-primary-foreground" : "bg-background text-foreground"
                }`}
              >
                <div className="flex flex-col h-full">
                  <span className={`inline-block self-start text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mb-2 ${
                    accent ? "bg-white/20" : "bg-primary/10 text-primary"
                  }`}>
                    -{discount}%
                  </span>
                  <h3 className="text-sm md:text-base font-bold line-clamp-2 mb-1">{p.name}</h3>
                  <p className={`text-xs mb-3 ${accent ? "opacity-90" : "text-muted-foreground"}`}>
                    {fmt(p.price)}{" "}
                    <span className={`line-through ${accent ? "opacity-70" : "text-muted-foreground/70"}`}>
                      {fmt(p.original_price!)}
                    </span>
                  </p>
                  {p.image_url && (
                    <img
                      src={getProxiedImageUrl(p.image_url)}
                      alt={p.name}
                      className="w-full h-24 md:h-28 object-contain mb-3"
                      onError={(e) => {
                        const t = e.target as HTMLImageElement;
                        t.onerror = null;
                        t.src = "/placeholder.svg";
                      }}
                    />
                  )}
                  <span className={`mt-auto inline-flex items-center gap-1 text-xs md:text-sm font-semibold ${
                    accent ? "" : "text-primary"
                  }`}>
                    Shop Now <ArrowRight className="h-3.5 w-3.5" />
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
