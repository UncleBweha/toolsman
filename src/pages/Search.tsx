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
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState("relevance");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const fetchProducts = async () => {
      if (!query.trim()) {
        setProducts([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      let dbQuery = supabase
        .from("products")
        .select(`*, category:categories(*)`)
        .eq("is_active", true)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,sku.ilike.%${query}%`);

      // Apply sorting
      switch (sortBy) {
        case "price-low":
          dbQuery = dbQuery.order("price", { ascending: true });
          break;
        case "price-high":
          dbQuery = dbQuery.order("price", { ascending: false });
          break;
        case "name":
          dbQuery = dbQuery.order("name", { ascending: true });
          break;
        case "newest":
          dbQuery = dbQuery.order("created_at", { ascending: false });
          break;
        default:
          dbQuery = dbQuery.order("created_at", { ascending: false });
      }

      const { data, error } = await dbQuery;

      if (error) {
        console.error("Search error:", error);
        setProducts([]);
      } else {
        setProducts(data || []);
      }
      setIsLoading(false);
    };

    fetchProducts();
  }, [query, sortBy]);

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
              Search Results for "{query}"
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
              No products found for "{query}"
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
