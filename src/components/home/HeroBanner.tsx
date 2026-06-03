import { useEffect, useState, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getProxiedImageUrl } from "@/lib/imageUtils";
import { motion, AnimatePresence } from "framer-motion";

const HeroBanner = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Pull a wider random pool from the active catalog so the banner isn't
  // limited to "featured" products. The pool refreshes every 5 minutes.
  const { data: pool = [] } = useQuery({
    queryKey: ["hero-pool"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, original_price, image_url, description")
        .eq("is_active", true)
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(60);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Build a fair, shuffled rotation queue (Fisher–Yates). Reshuffles when the
  // pool changes or we've cycled through every product — so a product never
  // appears twice in a row and every product gets equal exposure.
  const slides = useRef<typeof pool>([]);
  if (pool.length && slides.current.length === 0) {
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
        // Reshuffle when we complete a full cycle to keep order fresh
        if (next >= slides.current.length) {
          const a = [...pool];
          for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
          }
          // Avoid the last-shown item leading the new cycle
          if (a[0]?.id === slides.current[p]?.id && a.length > 1) {
            [a[0], a[1]] = [a[1], a[0]];
          }
          slides.current = a;
          return 0;
        }
        return next;
      });
    }, 3000);
    return () => clearInterval(t);
  }, [pool]);

  if (!slides.current.length) {

    return (
      <section className="py-3 md:py-6 bg-white">
        <div className="container">
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 md:p-10 min-h-[140px] flex items-center justify-center text-muted-foreground text-sm">
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
    <section className="py-3 md:py-6 bg-white">
      <div className="container">
        <div className="relative bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-sm border border-gray-200 p-3 md:p-6 lg:p-8 overflow-hidden">
          {/* Decorative blobs — GPU-accelerated transforms only */}
          <motion.div
            className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#FF5722]/10 blur-3xl"
            aria-hidden
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.6, 0.9, 0.6],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-blue-500/5 blur-3xl"
            aria-hidden
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-8 items-center min-h-[150px] md:min-h-[340px] lg:min-h-[420px] xl:min-h-[500px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                className="space-y-1.5 md:space-y-5"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <p className="text-[9px] md:text-sm font-bold text-[#FF5722] tracking-wider uppercase">
                  {eyebrow}
                </p>
                <h2 className="text-sm md:text-3xl lg:text-4xl xl:text-5xl font-extrabold text-gray-900 leading-tight line-clamp-2 md:line-clamp-3">
                  {slide.name}
                </h2>
                <p className="text-xs md:text-lg font-bold text-gray-900">
                  KSh {Number(slide.price).toLocaleString("en-US")}
                  {slide.original_price && (
                    <span className="ml-1.5 text-[10px] md:text-base text-muted-foreground line-through font-normal">
                      KSh {Number(slide.original_price).toLocaleString("en-US")}
                    </span>
                  )}
                </p>
                <Link
                  to={`/product/${slide.slug}`}
                  className="inline-flex items-center justify-center bg-[#FF5722] hover:bg-[#e64a19] text-white font-semibold rounded-lg text-[11px] md:text-base px-3 md:px-8 py-1.5 md:py-3.5 transition-all hover:scale-105 hover:shadow-lg bg-gradient-to-r from-[#FF5722] to-[#FF7043]"
                >
                  Shop Now <ArrowRight className="h-3 w-3 md:h-5 md:w-5 ml-1 md:ml-2" />
                </Link>
              </motion.div>
            </AnimatePresence>

            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide.id}
                  className="aspect-square md:h-[280px] lg:h-[340px] xl:h-[420px] md:aspect-auto rounded-xl bg-white border border-gray-100 flex items-center justify-center overflow-hidden p-2 md:p-4"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  whileHover={{ scale: 1.02 }}
                >
                  <img
                    src={getProxiedImageUrl(slide.image_url || "/placeholder.svg")}
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

          {slides.current.length > 1 && (
            <div className="flex gap-1.5 justify-center mt-3 md:mt-5">
              {Array.from({ length: Math.min(5, slides.current.length) }).map((_, index) => (
                <span
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${
                    index === currentSlide % 5 ? "w-6 bg-[#FF5722]" : "w-1.5 bg-gray-300"
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
