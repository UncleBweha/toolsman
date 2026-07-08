import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProductCard from "@/components/home/ProductCard";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Product } from "@/types/database";
import { SORT_OPTIONS, sortProducts, SortKey } from "@/lib/sortOptions";

const SITE = "https://toolsman.lovable.app";

const Brand = () => {
  const { slug } = useParams<{ slug: string }>();
  const [sortBy, setSortBy] = useState<SortKey>("newest");

  const { data: brand } = useQuery({
    queryKey: ["brand", slug],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("brands")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      return data as { id: string; name: string; slug: string; logo_url: string | null; description: string | null } | null;
    },
    enabled: !!slug,
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["brand-products", brand?.name],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .ilike("brand", brand!.name);
      return (data || []) as Product[];
    },
    enabled: !!brand?.name,
  });

  const sorted = useMemo(() => sortProducts(products, sortBy), [products, sortBy]);

  if (!brand && !isLoading && slug) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Brand not found</h1>
          <Button asChild><Link to="/brands">All brands</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {brand && (
        <Helmet>
          <title>{`${brand.name} in Kenya — Genuine products, fast delivery | Toolsman`}</title>
          <meta
            name="description"
            content={
              brand.description ||
              `Shop genuine ${brand.name} products in Kenya. Fast delivery, competitive prices, official warranty. Browse ${products.length} ${brand.name} items at Toolsman.`
            }
          />
          <link rel="canonical" href={`${SITE}/brand/${brand.slug}`} />
          <meta property="og:title" content={`${brand.name} | Toolsman`} />
          <meta property="og:url" content={`${SITE}/brand/${brand.slug}`} />
        </Helmet>
      )}
      <Header />
      <main className="flex-1 container py-6 md:py-8">
        <Breadcrumbs items={[{ label: "Brands", href: "/brands" }, { label: brand?.name || "…" }]} />

        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
          {brand?.logo_url && (
            <img
              src={brand.logo_url}
              alt={brand.name}
              className="h-16 w-24 object-contain bg-white border border-gray-200 rounded-lg p-2"
            />
          )}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{brand?.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {isLoading ? "Loading…" : `${sorted.length} product${sorted.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end mb-4">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF5722]" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="mb-4">No {brand?.name} products in stock right now.</p>
            <Button asChild><Link to="/">Browse other products</Link></Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sorted.map((p) => (
              <ProductCard
                key={p.id}
                productId={p.id}
                name={p.name}
                price={p.price}
                originalPrice={p.original_price}
                image={p.image_url || "/placeholder.svg"}
                slug={p.slug}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Brand;
