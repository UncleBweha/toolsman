import { useState } from "react";
import { useSearchParams, useLocation, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/home/ProductCard";
import SidebarFilter from "@/components/home/SidebarFilter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Grid3X3, LayoutList } from "lucide-react";
import { Product } from "@/types/database";

const Products = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Determine filter from route path or query params
  const getFilter = () => {
    if (location.pathname === "/deals") return "deals";
    if (location.pathname === "/new-arrivals") return "new-arrivals";
    if (location.pathname === "/best-sellers") return "best-sellers";
    return searchParams.get("filter");
  };

  const filter = getFilter();

  const getTitle = () => {
    switch (filter) {
      case "deals":
        return "Deals & Offers";
      case "new-arrivals":
        return "New Arrivals";
      case "best-sellers":
        return "Best Sellers";
      default:
        return "All Products";
    }
  };

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products-page", filter, sortBy],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*")
        .eq("is_active", true);

      // Apply filter
      if (filter === "deals") {
        query = query.not("original_price", "is", null);
      } else if (filter === "new-arrivals") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte("created_at", thirtyDaysAgo.toISOString());
      } else if (filter === "best-sellers") {
        query = query.eq("is_featured", true);
      }

      // Apply sort
      switch (sortBy) {
        case "price-low":
          query = query.order("price", { ascending: true });
          break;
        case "price-high":
          query = query.order("price", { ascending: false });
          break;
        case "name":
          query = query.order("name", { ascending: true });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
  });

  const formatPrice = (amount: number) => {
    return `Kshs ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Shop
        </Link>

        <div className="flex flex-col md:flex-row">
          <SidebarFilter filters={{ priceRange: [0, 100000], brands: [] }} onChange={() => {}} />
          <div className="flex-1">
            <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">{getTitle()}</h1>
        </div>

        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            {products.length} {products.length === 1 ? "product" : "products"}
          </p>
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">No products found</p>
            <Button asChild>
              <Link to="/">Browse All Products</Link>
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                productId={product.id}
                name={product.name}
                price={product.price}
                originalPrice={product.original_price}
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
                className="flex gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={product.image_url || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {product.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary">{formatPrice(product.price)}</span>
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
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Products;
