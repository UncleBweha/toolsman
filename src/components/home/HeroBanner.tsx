import { useEffect, useState, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getProductAlt, getProxiedImageUrl } from "@/lib/imageUtils";
import OptimizedImage from "@/components/OptimizedImage";
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
    <section className="py-2 md:py-3 bg-white">
      <div className="container">
        <div
          className="relative bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          style={{ padding: "clamp(12px, 2vw, 24px)" }}
        >
          {/* Decorative blobs */}
          <motion.div
            className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[#FF5722]/10 blur-3xl"
            aria-hidden
            animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="pointer-events-none absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-blue-500/5 blur-3xl"
            aria-hidden
            animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />

          <div
            className="relative grid grid-cols-2 gap-3 md:gap-6 items-center"
            style={{ minHeight: "130px" }}
          >
            {/* Left — text & CTA */}
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id + "-text"}
                className="space-y-1.5 md:space-y-3 min-w-0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                <p className="text-[9px] md:text-xs font-bold text-[#FF5722] tracking-wider uppercase">
                  {eyebrow}
                </p>
                <h2 className="text-sm md:text-2xl lg:text-3xl font-extrabold text-gray-900 leading-tight line-clamp-2 md:line-clamp-3">
                  {slide.name}
                </h2>
                <p className="text-xs md:text-base font-bold text-gray-900">
                  KSh {Number(slide.price).toLocaleString("en-US")}
                  {slide.original_price && (
                    <span className="ml-1.5 text-[10px] md:text-sm text-muted-foreground line-through font-normal">
                      KSh {Number(slide.original_price).toLocaleString("en-US")}
                    </span>
                  )}
                </p>
                <Link
                  to={`/product/${slide.slug}`}
                  className="inline-flex items-center justify-center bg-[#FF5722] hover:bg-[#e64a19] text-white font-semibold rounded-lg text-[11px] md:text-sm px-3 md:px-6 py-1.5 md:py-2.5 transition-all hover:scale-105 hover:shadow-md"
                >
                  Shop Now <ArrowRight className="h-3 w-3 md:h-4 md:w-4 ml-1 md:ml-1.5" />
                </Link>
              </motion.div>
            </AnimatePresence>

            {/* Right — product image */}
            <div className="relative flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide.id + "-img"}
                  className="aspect-square md:aspect-auto md:h-[200px] lg:h-[240px] xl:h-[280px] w-full rounded-xl bg-white border border-gray-100 flex items-center justify-center overflow-hidden p-2 md:p-3"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  whileHover={{ scale: 1.02 }}
                >
                  <OptimizedImage
                    src={slide.image_url}
                    alt={getProductAlt(slide.name)}
                    width={400}
                    height={400}
                    priority={true} // Priority loading for above-the-fold hero image
                    className="max-w-full max-h-full object-contain"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Slide indicator dots */}
          {slides.current.length > 1 && (
            <div className="flex gap-1.5 justify-center mt-2 md:mt-3">
              {Array.from({ length: Math.min(5, slides.current.length) }).map((_, index) => (
                <span
                  key={index}
                  className={`h-1 rounded-full transition-all ${
                    index === currentSlide % 5 ? "w-5 bg-[#FF5722]" : "w-1 bg-gray-300"
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
