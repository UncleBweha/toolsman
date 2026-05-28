import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Flame, Clock, TrendingUp } from "lucide-react";

/* ─── Countdown helpers ─── */
function getEndOfDay() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function calcLeft(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    h: Math.floor(diff / 3_600_000),
    m: Math.floor((diff % 3_600_000) / 60_000),
    s: Math.floor((diff % 60_000) / 1_000),
  };
}

/* ─── Skeleton card ─── */
const SkeletonCard = () => (
  <div className="rounded-xl overflow-hidden bg-white border border-gray-100 animate-pulse">
    <div className="aspect-square bg-gray-100" />
    <div className="p-3 space-y-2">
      <div className="h-3 bg-gray-100 rounded w-3/4" />
      <div className="h-4 bg-gray-100 rounded w-1/2" />
    </div>
  </div>
);

/* ─── Deal product card ─── */
const DealCard = ({ name, price, originalPrice, image, slug }: {
  name: string; price: number; originalPrice: number; image: string; slug: string;
}) => {
  const discount = Math.round(((originalPrice - price) / originalPrice) * 100);
  const fmt = (n: number) => `KSh ${Number(n).toLocaleString()}`;

  const badge =
    discount >= 40 ? { label: "🔥 Hot Deal", cls: "bg-red-500" } :
    discount >= 25 ? { label: "⚡ Flash Sale", cls: "bg-orange-500" } :
                     { label: "💎 Deal", cls: "bg-[#FF5722]" };

  return (
    <Link
      to={`/product/${slug}`}
      className="group relative flex flex-col rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      {/* Discount badge */}
      <span className={`absolute top-2 left-2 z-10 ${badge.cls} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>
        {badge.label}
      </span>
      <span className="absolute top-2 right-2 z-10 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
        -{discount}%
      </span>

      {/* Image */}
      <div className="aspect-square bg-gray-50 overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
        />
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-xs text-gray-700 font-medium leading-snug line-clamp-2">{name}</p>
        <div className="mt-auto pt-1">
          <p className="text-sm font-extrabold text-gray-900">{fmt(price)}</p>
          <p className="text-[11px] text-gray-400 line-through">{fmt(originalPrice)}</p>
        </div>
        {/* Stock bar */}
        <div className="mt-1">
          <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
            <span>Limited Stock</span>
            <span className="text-[#FF5722] font-semibold">Ending Soon</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FF5722] to-orange-400"
              style={{ width: `${Math.max(15, Math.min(80, 100 - discount))}%`, transition: "width 1s ease" }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
};

/* ─── Time block ─── */
const TimeBlock = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center bg-[#0f172a] text-white rounded-lg px-2.5 py-1.5 min-w-[44px] border border-white/10">
    <span className="text-base md:text-xl font-black tabular-nums leading-none">
      {String(value).padStart(2, "0")}
    </span>
    <span className="text-[9px] text-gray-400 uppercase tracking-wider mt-0.5">{label}</span>
  </div>
);

/* ─── Main section ─── */
const DealsCountdown = () => {
  const [target] = useState(getEndOfDay);
  const [left, setLeft] = useState(() => calcLeft(target));

  useEffect(() => {
    const id = setInterval(() => setLeft(calcLeft(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals-flash"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, original_price, image_url")
        .eq("is_active", true)
        .not("original_price", "is", null)
        .order("created_at", { ascending: false })
        .limit(30);
      return (data || [])
        .filter((p) => p.original_price && p.original_price > p.price)
        .slice(0, 6);
    },
  });

  if (!isLoading && deals.length === 0) return null;

  return (
    <section className="py-8 md:py-12 bg-gradient-to-b from-gray-50 to-white">
      <div className="container">
        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          {/* Left: title + badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#FF5722] shadow-lg shadow-[#FF5722]/30">
                <Flame className="h-4 w-4 text-white" />
              </span>
              <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight">
                Flash Deals
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-600 text-[11px] font-bold uppercase tracking-wide animate-pulse">
              <Zap className="h-3 w-3" /> Live Now
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-orange-600 text-[11px] font-bold">
              <TrendingUp className="h-3 w-3" /> Trending Today
            </span>
          </div>

          {/* Right: countdown + link */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">Ends in:</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TimeBlock value={left.h} label="Hrs" />
              <span className="text-gray-400 font-bold text-sm">:</span>
              <TimeBlock value={left.m} label="Min" />
              <span className="text-gray-400 font-bold text-sm">:</span>
              <TimeBlock value={left.s} label="Sec" />
            </div>
            <Link
              to="/deals"
              className="hidden md:inline-flex items-center gap-1 text-sm text-[#FF5722] font-semibold hover:underline"
            >
              See All Deals →
            </Link>
          </div>
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : deals.map((p) => (
                <DealCard
                  key={p.id}
                  name={p.name}
                  price={p.price}
                  originalPrice={p.original_price!}
                  image={p.image_url || "/placeholder.svg"}
                  slug={p.slug}
                />
              ))}
        </div>

        <div className="mt-4 text-center md:hidden">
          <Link to="/deals" className="text-sm text-[#FF5722] font-semibold hover:underline">
            See All Flash Deals →
          </Link>
        </div>
      </div>
    </section>
  );
};

export default DealsCountdown;
