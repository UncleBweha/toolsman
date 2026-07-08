import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight } from "lucide-react";

const BrandStrip = () => {
  const { data: brands = [] } = useQuery({
    queryKey: ["featured-brands"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("brands")
        .select("id, name, slug, logo_url, is_featured")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("display_order")
        .limit(12);
      return (data || []) as Array<{ id: string; name: string; slug: string; logo_url: string | null }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (brands.length === 0) return null;

  return (
    <section className="py-6 md:py-10 bg-white">
      <div className="container">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div>
            <h2 className="text-base md:text-2xl font-bold text-gray-900">Shop by Brand</h2>
            <p className="text-xs md:text-sm text-gray-500 mt-0.5">Trusted names, genuine products</p>
          </div>
          <Link
            to="/brands"
            className="text-xs md:text-sm font-semibold text-[#FF5722] hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3 md:h-4 md:w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3">
          {brands.map((b) => (
            <Link
              key={b.id}
              to={`/brand/${b.slug}`}
              className="group aspect-[3/2] flex items-center justify-center bg-white border border-gray-200 rounded-lg hover:border-[#FF5722] hover:shadow-md transition-all p-2 md:p-3"
            >
              {b.logo_url ? (
                <img
                  src={b.logo_url}
                  alt={b.name}
                  loading="lazy"
                  className="max-w-full max-h-full object-contain grayscale group-hover:grayscale-0 transition-all"
                />
              ) : (
                <span className="text-sm md:text-base font-extrabold text-gray-700 group-hover:text-[#FF5722] tracking-tight">
                  {b.name}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandStrip;
