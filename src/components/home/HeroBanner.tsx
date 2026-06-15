import { useEffect, useState, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getProxiedImageUrl } from "@/lib/imageUtils";
import { motion, AnimatePresence } from "framer-motion";

const HeroBanner = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const { data: pool = [] } = useQuery({
    queryKey: ["hero-pool"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, original_price, image_url, description")
        .eq("is_active", true)
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(100); // Larger selection to find products with actual photos
      
      // Ensure we only include products with a valid, non-empty, non-placeholder image
      return (data || []).filter(
        (p) =>
          p.image_url &&
          p.image_url.trim() !== "" &&
          p.image_url !== "null" &&
          !p.image_url.toLowerCase().includes("placeholder")
      );
    },
    staleTime: 5 * 60 * 1000,
  });

  // Preload all product images to ensure instantaneous transition without flash/blank frames
  useEffect(() => {
    if (!pool.length) return;
    pool.forEach((product) => {
      if (product.image_url) {
        const img = new Image();
        img.src = getProxiedImageUrl(product.image_url);
      }
    });
  }, [pool]);

  // Fisher–Yates shuffle — fair rotation, no repeats
  const slides = useRef<typeof pool>([]);
  if (pool.length && (slides.current.length === 0 || slides.current !== pool)) {
    const a = [...pool];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    slides.current = a;
  }

  useEffect(() => {
    if (!slides.current.length) return;
    const t = setInterval(() => {
      setCurrentSlide((p) => {
        const next = p + 1;
        if (next >= slides.current.length) {
          const a = [...pool];
          for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
          }
          if (a[0]?.id === slides.current[p]?.id && a.length > 1) {
            [a[0], a[1]] = [a[1], a[0]];
          }
          slides.current = a;
          return 0;
        }
        return next;
      });
    }, 4500); // 4.5 seconds for better reading time
    return () => clearInterval(t);
  }, [pool]);

  if (!slides.current.length) {
    return (
      <section className="py-2 md:py-3 bg-white">
        <div className="container">
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 md:p-8 h-32 md:h-40 flex items-center justify-center text-muted-foreground text-sm">
            Welcome to Toolsman — premium tools and equipment.
          </div>
        </div>
      </section>
    );
  }

  const slide = slides.current[currentSlide % slides.current.length];
  const eyebrows = ["Just Arrived", "Best Sellers", "Top Picks", "Trending Now", "Editor's Pick"];
  const eyebrow = eyebrows[currentSlide % eyebrows.length];

  return (
    <section className="py-3 md:py-5 bg-white">
      <div className="container">
        <div
          className="relative bg-[#0B1D3A] rounded-2xl overflow-hidden shadow-sm"
          style={{ padding: "clamp(16px, 4vw, 40px)" }}
        >
          <div
            className="relative grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 items-center"
            style={{ minHeight: "220px" }}
          >
            {/* Left — text & CTA */}
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id + "-text"}
                className="space-y-3 md:space-y-4 min-w-0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                <p className="text-[10px] md:text-xs font-bold text-[#FF5722] tracking-widest uppercase">
                  {eyebrow}
                </p>
                <h2 className="text-xl md:text-3xl lg:text-4xl font-extrabold text-white leading-tight line-clamp-2 md:line-clamp-3">
                  {slide.name}
                </h2>
                <p className="text-base md:text-2xl font-extrabold text-white flex items-baseline gap-2">
                  KSh {Number(slide.price).toLocaleString("en-US")}
                  {slide.original_price && (
                    <span className="text-xs md:text-base text-white/40 line-through font-normal">
                      KSh {Number(slide.original_price).toLocaleString("en-US")}
                    </span>
                  )}
                </p>
                <div>
                  <Link
                    to={`/product/${slide.slug}`}
                    className="inline-flex items-center justify-center bg-[#FF5722] hover:bg-[#e64a19] text-white font-bold rounded-lg text-xs md:text-sm px-5 md:px-8 py-2.5 md:py-3.5 transition-all hover:scale-105 hover:shadow-md"
                  >
                    Shop Now <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4 ml-1.5" />
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Right — product image */}
            <div className="relative flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide.id + "-img"}
                  className="aspect-square md:aspect-auto md:h-[220px] lg:h-[260px] xl:h-[300px] w-full rounded-2xl bg-white flex items-center justify-center overflow-hidden p-4 md:p-6 shadow-lg"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  whileHover={{ scale: 1.01 }}
                >
                  <img
                    src={getProxiedImageUrl(slide.image_url)}
                    alt={slide.name}
                    loading="eager"
                    decoding="async"
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      const t = e.target as HTMLImageElement;
                      t.onerror = null;
                      t.src = "/placeholder.svg";
                    }}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Slide indicator dots */}
          {slides.current.length > 1 && (
            <div className="flex gap-1.5 justify-center mt-4 md:mt-6">
              {Array.from({ length: Math.min(5, slides.current.length) }).map((_, index) => (
                <span
                  key={index}
                  className={`h-1 rounded-full transition-all ${
                    index === currentSlide % 5 ? "w-5 bg-[#FF5722]" : "w-1.5 bg-white/30"
                  }`}
                  aria-hidden
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
