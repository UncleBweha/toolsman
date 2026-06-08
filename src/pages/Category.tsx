import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/home/ProductCard";
import SidebarFilter, { FilterState } from "@/components/home/SidebarFilter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Grid3X3, LayoutList } from "lucide-react";
import { Product, Category as CategoryType } from "@/types/database";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious, PaginationEllipsis,
} from "@/components/ui/pagination";

const PRODUCTS_PER_PAGE = 12;
const fmt = (n: number) => `KSh ${Number(n).toLocaleString("en-US")}`;

const Category = () => {
  const { slug } = useParams<{ slug: string }>();
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({ priceRange: [0, 100000], brands: [] });

  const { data: category, isLoading: categoryLoading } = useQuery({
    queryKey: ["category", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories").select("*").eq("slug", slug).single();
      if (error) throw error;
      return data as CategoryType;
    },
    enabled: !!slug,
  });

  // Subcategories of current category
  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories", category?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("parent_id", category!.id)
        .eq("is_active", true)
        .order("display_order");
      return data || [];
    },
    enabled: !!category?.id,
  });

  // All products in category (for client-side filtering)
  const { data: allProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ["category-products-all", category?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products").select("*")
        .eq("category_id", category!.id).eq("is_active", true);
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!category?.id,
  });

  const maxPrice = useMemo(() => {
    if (!allProducts.length) return 100000;
    return Math.max(...allProducts.map((p) => Number(p.price) || 0), 1000);
  }, [allProducts]);

  // Sync price range when product set / max price changes
  useEffect(() => {
    setFilters((prev) => {
      const [lo, hi] = prev.priceRange;
      // First load (default 100000) OR upper bound out of bounds → reset to full range
      if (hi === 100000 || hi > maxPrice || lo > maxPrice) {
        return { ...prev, priceRange: [0, maxPrice] };
      }
      return prev;
    });
  }, [maxPrice]);


  const filteredSorted = useMemo(() => {
    let arr = allProducts.filter((p) => {
      const price = Number(p.price) || 0;
      if (price < filters.priceRange[0] || price > filters.priceRange[1]) return false;
      if (filters.brands.length) {
        const first = (p.name || "").trim().split(/\s+/)[0];
        if (!filters.brands.includes(first)) return false;
      }
      return true;
    });
    switch (sortBy) {
      case "price-low": arr = [...arr].sort((a, b) => a.price - b.price); break;
      case "price-high": arr = [...arr].sort((a, b) => b.price - a.price); break;
      case "name": arr = [...arr].sort((a, b) => a.name.localeCompare(b.name)); break;
      default: arr = [...arr].sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
      );
    }
    return arr;
  }, [allProducts, filters, sortBy]);

  const totalCount = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PRODUCTS_PER_PAGE));
  const products = filteredSorted.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  if ((categoryLoading || productsLoading) && !allProducts.length) {
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

  if (!category) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-12">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold mb-4">Category not found</h1>
            <Button asChild><Link to="/">Back to Shop</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-6 md:py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Shop
        </Link>

        <div className="flex flex-col md:flex-row">
          <SidebarFilter
            categoryId={category.id}
            maxPrice={maxPrice}
            filters={filters}
            onChange={(f) => { setFilters(f); setCurrentPage(1); }}
            subcategories={subcategories}
          />
          <div className="flex-1 min-w-0">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{category.name}</h1>
              {category.description && (
                <p className="text-muted-foreground">{category.description}</p>
              )}
            </div>

            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <p className="text-muted-foreground text-sm">
                {totalCount} {totalCount === 1 ? "product" : "products"}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <Button variant={viewMode === "grid" ? "default" : "outline"} size="icon" onClick={() => setViewMode("grid")}>
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewMode("list")}>
                    <LayoutList className="h-4 w-4" />
                  </Button>
                </div>
                <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[170px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
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
                <p className="text-muted-foreground mb-4">No products match your filters</p>
                <Button onClick={() => setFilters({ priceRange: [0, maxPrice], brands: [] })}>
                  Clear Filters
                </Button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((p) => (
                  <ProductCard key={p.id} productId={p.id} name={p.name} price={p.price}
                    originalPrice={p.original_price} image={p.image_url || "/placeholder.svg"} slug={p.slug} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {products.map((p) => (
                  <Link key={p.id} to={`/product/${p.slug}`} className="flex gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="w-24 h-24 md:w-32 md:h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      <img src={p.image_url || "/placeholder.svg"} alt={p.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold mb-2 line-clamp-2">{p.name}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-primary">{fmt(p.price)}</span>
                        {p.original_price && (
                          <span className="text-sm text-muted-foreground line-through">{fmt(p.original_price)}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                    </PaginationItem>
                    {getPageNumbers().map((page, i) => (
                      <PaginationItem key={i}>
                        {page === "ellipsis" ? <PaginationEllipsis /> : (
                          <PaginationLink onClick={() => handlePageChange(page)} isActive={currentPage === page} className="cursor-pointer">
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Category;
