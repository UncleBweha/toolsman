import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getProductAlt } from "@/lib/imageUtils";
import OptimizedImage from "@/components/OptimizedImage";

import categoryPowerTools from "@/assets/category-power-tools.jpg";
import categoryHandTools from "@/assets/category-hand-tools.jpg";
import categorySafety from "@/assets/category-safety.jpg";
import categoryMeasuring from "@/assets/category-measuring.jpg";
import categoryGarden from "@/assets/category-garden.jpg";
import categoryElectrical from "@/assets/category-electrical.jpg";
import categoryElectronics from "@/assets/category-electronics.jpg";
import categoryPhoneAccessories from "@/assets/category-phone-accessories.jpg";
import categorySolar from "@/assets/category-solar.jpg";
import categoryCCTV from "@/assets/category-cctv.jpg";
import categoryKitchen from "@/assets/category-kitchen.jpg";

const fallbackImages: Record<string, string> = {
  "tools-machinery": categoryPowerTools,
  "locks-hardware": categoryCCTV,
  "plumbing-irrigation": categoryGarden,
  "electronics-electricals-it": categoryElectronics,
  "solar-energy-cold-solutions": categorySolar,
  "home-living": categoryKitchen,
  "lab-medical-supplies": categorySafety,
  "technical-services": categoryHandTools,
  "power-hand-tools": categoryPowerTools,
  "farm-equipment": categoryGarden,
  "safety-ware-ppe": categorySafety,
  "security-surveillance-cctv": categoryCCTV,
  "electrical-supplies": categoryElectrical,
  "computer-mobile-accessories": categoryPhoneAccessories,
  "home-appliances": categoryKitchen,
};

const CategoryGrid = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["active-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 280;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const getCategoryImage = (category: { image_url: string | null; slug: string }) => {
    if (category.image_url) return category.image_url;
    return fallbackImages[category.slug] || "/placeholder.svg";
  };

  if (isLoading) {
    return (
      <section className="py-8 md:py-12 bg-white">
        <div className="container">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">
            Popular Departments
          </h2>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF5722]" />
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="py-4 md:py-10 bg-white">
      <div className="container">
        <div className="flex items-center justify-between mb-3 md:mb-5">
          <h2 className="text-base md:text-2xl font-bold text-gray-900">
            Shop by Category
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => scroll("left")}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-all text-gray-700 hover:text-[#FF5722]"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-all text-gray-700 hover:text-[#FF5722]"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-3 md:gap-5 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
        >
          {categories.map((category, index) => (
            <Link
              key={category.id}
              to={`/category/${category.slug}`}
              className="flex-shrink-0 w-20 md:w-32 group snap-start"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl bg-white shadow-sm border border-gray-200 flex items-center justify-center overflow-hidden group-hover:border-[#FF5722] transition-all duration-300">
                  <OptimizedImage
                    src={getCategoryImage(category)}
                    alt={getProductAlt(category.name, null, "department")}
                    width={100}
                    height={100}
                    className="w-10 h-10 md:w-16 md:h-16 object-contain"
                  />
                </div>
                <h3 className="text-[11px] md:text-sm font-semibold text-gray-800 text-center group-hover:text-[#FF5722] transition-colors line-clamp-2 leading-tight">
                  {category.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;
