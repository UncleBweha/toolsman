import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Grid, List, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import ProductCard from "@/components/home/ProductCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Product } from "@/types/database";

const formatPrice = (price: number) => {
  return `Kshs ${Number(price).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
};

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const tagFilter = searchParams.get("tag") || "";
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState("relevance");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const fetchProducts = async () => {
      // Need at least one of: text query or tag filter
      if (!query.trim() && !tagFilter.trim()) {
        setProducts([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        if (tagFilter.trim()) {
          // Tag-based search: fetch products that have the tag in either column
          const tag = tagFilter.trim().toLowerCase();
          const [r1, r2] = await Promise.all([
            supabase
              .from("products")
              .select(`*, category:categories(*)`)
              .eq("is_active", true)
              .overlaps("tags", [tag])
              .order("created_at", { ascending: false }),
            supabase
              .from("products")
              .select(`*, category:categories(*)`)
              .eq("is_active", true)
              .overlaps("generated_tags", [tag])
              .order("created_at", { ascending: false }),
          ]);
          const merged = [...(r1.data || []), ...(r2.data || [])];
          const seen = new Set<string>();
          const unique = merged.filter((p: Product) => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
          });
          setProducts(unique as Product[]);
        } else {
          // Text-based search
          let dbQuery = supabase
            .from("products")
            .select(`*, category:categories(*)`)
            .eq("is_active", true)
            .or(`name.ilike.%${query}%,description.ilike.%${query}%,sku.ilike.%${query}%`);

          switch (sortBy) {
            case "price-low": dbQuery = dbQuery.order("price", { ascending: true }); break;
            case "price-high": dbQuery = dbQuery.order("price", { ascending: false }); break;
            case "name": dbQuery = dbQuery.order("name", { ascending: true }); break;
            case "newest": dbQuery = dbQuery.order("created_at", { ascending: false }); break;
            default: dbQuery = dbQuery.order("created_at", { ascending: false });
          }

          const { data, error } = await dbQuery;
          if (error) throw error;
          setProducts((data as unknown as Product[]) || []);
        }
      } catch (err) {
        console.error("Search error:", err);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [query, tagFilter, sortBy]);

  // SEO: per-tag/per-query meta tags so tag pages can rank independently
  useEffect(() => {
    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        const [k, v] = selector.replace(/^meta\[/, "").replace(/\]$/, "").split("=");
        el.setAttribute(k, v.replace(/['"]/g, ""));
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };
    const setCanonical = (href: string) => {
      let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", "canonical");
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
    };

    const base = "https://toolsman.lovable.app";
    if (tagFilter) {
      const pretty = tagFilter.replace(/[-_]+/g, " ").trim();
      const title = `${pretty} in Kenya | Shop ${pretty} online — Toolsman`;
      const desc = `Browse ${pretty} and related products in Kenya. Fast nationwide delivery, secure payments and after-sales support from Toolsman.`;
      document.title = title;
      setMeta('meta[name="description"]', "content", desc);
      setMeta('meta[name="keywords"]', "content", `${pretty}, ${pretty} Kenya, buy ${pretty} online, ${pretty} for sale, Toolsman`);
      setMeta('meta[property="og:title"]', "content", title);
      setMeta('meta[property="og:description"]', "content", desc);
      setMeta('meta[property="og:type"]', "content", "website");
      setMeta('meta[property="og:url"]', "content", `${base}/search?tag=${encodeURIComponent(tagFilter)}`);
      setMeta('meta[name="robots"]', "content", "index, follow");
      setCanonical(`${base}/search?tag=${encodeURIComponent(tagFilter)}`);
    } else if (query) {
      const title = `Search: ${query} — Toolsman`;
      document.title = title;
      setMeta('meta[name="description"]', "content", `Search results for "${query}" on Toolsman Kenya.`);
      setMeta('meta[name="robots"]', "content", "noindex, follow");
      setCanonical(`${base}/search?q=${encodeURIComponent(query)}`);
    }
  }, [query, tagFilter]);


  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AnnouncementBar />
      <Header />

      <main className="flex-1 container py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-primary hover:underline mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Shop
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {tagFilter
                ? <span>Products tagged <span className="text-[#FF5722]">#{tagFilter}</span></span>
                : <>Search Results for "{query}"</>
              }
            </h1>
            <p className="text-muted-foreground mt-1">
              {isLoading ? "Searching..." : `${products.length} product${products.length !== 1 ? "s" : ""} found`}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg mb-4">
              {tagFilter
                ? `No products found for tag "${tagFilter}"`
                : `No products found for "${query}"`
              }
            </p>
            <p className="text-muted-foreground mb-6">
              Try searching with different keywords or browse our categories
            </p>
            <Link to="/products">
              <Button>Browse All Products</Button>
            </Link>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                productId={product.id}
                name={product.name}
                price={Number(product.price)}
                originalPrice={product.original_price ? Number(product.original_price) : undefined}
                image={product.image_url || "/placeholder.svg"}
                slug={product.slug}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.slug}`}
                className="flex gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow bg-card"
              >
                <img
                  src={product.image_url || "/placeholder.svg"}
                  alt={product.name}
                  className="w-24 h-24 object-cover rounded"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground hover:text-primary">
                    {product.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {product.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-bold text-primary">
                      {formatPrice(product.price)}
                    </span>
                    {product.original_price && (
                      <span className="text-sm text-muted-foreground line-through">
                        {formatPrice(product.original_price)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Search;
