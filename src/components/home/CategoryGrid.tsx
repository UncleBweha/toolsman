import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  "measuring-tools": categoryMeasuring,
};

const CategoryGrid = () => {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["home-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("display_order", { ascending: true })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  const getImage = (c: { image_url: string | null; slug: string }) =>
    c.image_url || fallbackImages[c.slug] || "/placeholder.svg";

  return (
    <section className="py-8 md:py-14 bg-white">
      <div className="container">
        <div className="mb-5 md:mb-8">
          <h2 className="text-lg md:text-2xl font-extrabold text-gray-900 tracking-tight">
            Shop by Category
          </h2>
          <p className="text-xs md:text-sm text-gray-500 mt-1">Browse our top departments</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#FF5722]" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 md:gap-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/category/${c.slug}`}
                className="group bg-white rounded-xl border border-gray-200 hover:border-[#FF5722] hover:shadow-md transition-all duration-200 p-4 md:p-5 flex flex-col items-center justify-center text-center gap-3"
              >
                <div className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
                  <img
                    src={getImage(c)}
                    alt={c.name}
                    loading="lazy"
                    className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
                <h3 className="text-xs md:text-sm font-semibold text-gray-800 group-hover:text-[#FF5722] transition-colors leading-tight line-clamp-2">
                  {c.name}
                </h3>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CategoryGrid;
