import ProductCard from "./ProductCard";
import { useProducts } from "@/hooks/useProducts";
import { Loader2 } from "lucide-react";

interface FeaturedProductsProps {
  title: string;
  showBanner?: boolean;
  featured?: boolean;
}

const FeaturedProducts = ({ title, showBanner = false, featured = false }: FeaturedProductsProps) => {
  const { products, isLoading } = useProducts({ featured, limit: 8 });

  return (
    <section className="py-4 md:py-10 bg-background">
      <div className="container">
        <div className="flex items-center gap-3 mb-3 md:mb-5">
          <h2 className="text-base md:text-2xl font-bold text-foreground">{title}</h2>
          {showBanner && (
            <div className="hidden md:flex items-center gap-2 bg-primary/10 px-4 py-1 rounded-full">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse-soft" />
              <span className="text-sm font-medium text-primary">Limited Time Offers</span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            No products available yet. Check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-5">
            {products.map((p) => (
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
      </div>
    </section>
  );
};

export default FeaturedProducts;
