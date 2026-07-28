import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Loader2 } from "lucide-react";

const SITE = "https://toolsman.lovable.app";

const Brands = () => {
  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["all-brands"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("brands")
        .select("id, name, slug, logo_url, is_featured")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("name");
      return (data || []) as Array<{ id: string; name: string; slug: string; logo_url: string | null; is_featured: boolean }>;
    },
  });

  // Group alphabetically
  const grouped = brands.reduce<Record<string, typeof brands>>((acc, b) => {
    const letter = b.name[0]?.toUpperCase() || "#";
    (acc[letter] ||= []).push(b);
    return acc;
  }, {});
  const letters = Object.keys(grouped).sort();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Helmet>
        <title>Shop by Brand — Bosch, Ingco, Makita, Samsung & more | Toolsman</title>
        <meta
          name="description"
          content="Browse products by brand at Toolsman. Genuine Bosch, Makita, DeWalt, Ingco, Total, Samsung, Apple, LG, HP, Dell and more. Fast delivery across Kenya."
        />
        <link rel="canonical" href={`${SITE}/brands`} />
        <meta property="og:title" content="Shop by Brand | Toolsman" />
        <meta property="og:url" content={`${SITE}/brands`} />
      </Helmet>
      <Header />
      <main className="flex-1 container py-6 md:py-8">
        <Breadcrumbs items={[{ label: "Brands" }]} />
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Shop by Brand</h1>
        <p className="text-gray-500 mb-8">
          {brands.length} trusted brands, all genuine, all delivered fast.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF5722]" />
          </div>
        ) : (
          <div className="space-y-8">
            {letters.map((letter) => (
              <div key={letter}>
                <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                  {letter}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {grouped[letter].map((b) => (
                    <Link
                      key={b.id}
                      to={`/brand/${b.slug}`}
                      className="group aspect-[3/2] flex items-center justify-center bg-white border border-gray-200 rounded-lg hover:border-[#FF5722] hover:shadow-md transition-all p-4"
                    >
                      {b.logo_url ? (
                        <img
                          src={b.logo_url}
                          alt={b.name}
                          loading="lazy"
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <span className="text-lg font-extrabold text-gray-800 group-hover:text-[#FF5722]">
                          {b.name}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Brands;
