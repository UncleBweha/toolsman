import { useEffect, useState, useRef, useMemo } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getProxiedImageUrl } from "@/lib/imageUtils";
import { AnimatePresence, motion } from "framer-motion";

const HeroBanner = () => {
  const [index, setIndex] = useState(0);

  const { data: pool = [] } = useQuery({
    queryKey: ["hero-slides"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, original_price, image_url, description")
        .eq("is_active", true)
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(60);
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

  // Pick up to 5 slides, stable order
  const slides = useMemo(() => pool.slice(0, 5), [pool]);

  // Preload images
  useEffect(() => {
    slides.forEach((p) => {
      if (p.image_url) {
        const img = new Image();
        img.src = getProxiedImageUrl(p.image_url);
      }
    });
  }, [slides]);

  // Auto-rotate every 4s
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (slides.length < 2) return;
    timer.current = window.setInterval(() => {
      setIndex((p) => (p + 1) % slides.length);
    }, 4000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [slides.length]);

  const goPrev = () => setIndex((p) => (p - 1 + slides.length) % slides.length);
  const goNext = () => setIndex((p) => (p + 1) % slides.length);

  if (!slides.length) {
    return (
      <section className="bg-white">
        <div className="container py-3">
          <div className="rounded-2xl bg-[#0f172a] h-[320px] md:h-[500px] flex items-center justify-center text-white/80 text-sm">
            Loading featured products…
          </div>
        </div>
      </section>
    );
  }

  const slide = slides[index];
  const fmt = (n: number) => `KSh ${Number(n).toLocaleString("en-US")}`;

  return (
    <section className="bg-white">
      <div className="container py-3 md:py-4">
        <div className="relative h-[320px] md:h-[500px] rounded-2xl overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#0f172a] shadow-md">
          {/* Decorative accent */}
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#FF5722]/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-yellow-400/5 blur-3xl pointer-events-none" />

          <div className="relative h-full grid grid-cols-2 items-center px-5 md:px-12 lg:px-16">
            {/* Text side */}
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id + "-text"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-white space-y-2 md:space-y-4 max-w-md z-10"
              >
                <span className="inline-block text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-[#FF5722]">
                  Featured Product
                </span>
                <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-extrabold leading-tight line-clamp-3">
                  {slide.name}
                </h1>
                <p className="hidden md:block text-sm lg:text-base text-white/70 line-clamp-2">
                  {slide.description?.replace(/<[^>]*>/g, "").slice(0, 140) ||
                    "Premium quality tools and equipment, built for professionals."}
                </p>
                <div className="flex items-baseline gap-2 md:gap-3">
                  <span className="text-lg md:text-3xl font-extrabold text-white">{fmt(slide.price)}</span>
                  {slide.original_price && slide.original_price > slide.price && (
                    <span className="text-xs md:text-base text-white/50 line-through">
                      {fmt(slide.original_price)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 md:gap-3 pt-1 md:pt-2">
                  <Link
                    to={`/product/${slide.slug}`}
                    className="inline-flex items-center gap-1.5 bg-[#FF5722] hover:bg-[#e64a19] text-white font-bold rounded-lg px-3.5 md:px-6 py-2 md:py-3 text-xs md:text-sm transition-colors"
                  >
                    Shop Now <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </Link>
                  <Link
                    to={`/product/${slide.slug}`}
                    className="inline-flex items-center bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-lg px-3.5 md:px-6 py-2 md:py-3 text-xs md:text-sm transition-colors backdrop-blur-sm"
                  >
                    View Details
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Image side */}
            <div className="relative h-full flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.img
                  key={slide.id + "-img"}
                  src={getProxiedImageUrl(slide.image_url!)}
                  alt={slide.name}
                  loading="eager"
                  decoding="async"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="max-h-[260px] md:max-h-[420px] max-w-full object-contain drop-shadow-2xl"
                  onError={(e) => {
                    const t = e.target as HTMLImageElement;
                    t.onerror = null;
                    t.src = "/placeholder.svg";
                  }}
                />
              </AnimatePresence>
            </div>
          </div>

          {/* Arrows */}
          {slides.length > 1 && (
            <>
              <button
                onClick={goPrev}
                aria-label="Previous slide"
                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 h-9 w-9 md:h-11 md:w-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white flex items-center justify-center border border-white/20 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={goNext}
                aria-label="Next slide"
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 h-9 w-9 md:h-11 md:w-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white flex items-center justify-center border border-white/20 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Dots */}
          {slides.length > 1 && (
            <div className="absolute bottom-3 md:bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-6 bg-[#FF5722]" : "w-1.5 bg-white/40 hover:bg-white/60"
                  }`}
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
