import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Zap } from "lucide-react";
import { getProxiedImageUrl } from "@/lib/imageUtils";

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

const DealCard = ({
  name, price, originalPrice, image, slug,
}: {
  name: string; price: number; originalPrice: number; image: string; slug: string;
}) => {
  const discount = Math.round(((originalPrice - price) / originalPrice) * 100);
  const fmt = (n: number) => `KSh ${Number(n).toLocaleString()}`;

  return (
    <Link
      to={`/product/${slug}`}
      className="group flex flex-col rounded-xl overflow-hidden bg-white p-3 shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-gray-100 hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 h-full"
    >
      {/* Image */}
      <div className="relative aspect-square bg-white rounded-lg overflow-hidden mb-2.5">
        <span className="absolute top-1.5 left-1.5 z-10 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
          -{discount}%
        </span>
        <img
          src={getProxiedImageUrl(image)}
          alt={name}
          className="w-full h-full object-contain p-2"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg";
          }}
        />
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 flex-1">
        <h3 className="text-xs font-medium text-gray-900 leading-snug line-clamp-2 min-h-[2.5em] hover:text-[#FF5722] transition-colors">
          {name}
        </h3>
        <div className="mt-auto pt-2 flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm font-bold text-[#FF5722]">{fmt(price)}</span>
          <span className="text-[11px] text-gray-400 line-through">{fmt(originalPrice)}</span>
        </div>
      </div>
    </Link>
  );
};

/* ─── Time block ─── */
const TimeBlock = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center bg-[#0B1D3A] text-white rounded-md px-2.5 py-1.5 min-w-[40px] shadow-sm">
    <span className="text-sm md:text-base font-bold tabular-nums leading-none">
      {String(value).padStart(2, "0")}
    </span>
    <span className="text-[9px] text-gray-400 uppercase tracking-wide mt-0.5">{label}</span>
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
    <section className="py-6 md:py-10 bg-gray-50 border-y border-gray-100">
      <div className="container">
        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          {/* Left: title */}
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[#FF5722]">
              <Zap className="h-3.5 w-3.5 text-white" />
            </span>
            <h2 className="text-base md:text-xl font-bold text-gray-900">Flash Deals</h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FF5722]/10 border border-[#FF5722]/20 text-[#FF5722] text-[10px] font-bold uppercase tracking-wide">
              Today Only
            </span>
          </div>

          {/* Right: countdown + link */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">Ends in:</span>
            </div>
            <div className="flex items-center gap-1">
              <TimeBlock value={left.h} label="Hrs" />
              <span className="text-gray-400 font-bold text-xs">:</span>
              <TimeBlock value={left.m} label="Min" />
              <span className="text-gray-400 font-bold text-xs">:</span>
              <TimeBlock value={left.s} label="Sec" />
            </div>
            <Link
              to="/deals"
              className="hidden md:inline-flex items-center gap-1 text-xs text-[#FF5722] font-semibold hover:underline"
            >
              See All →
            </Link>
          </div>
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5">
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
          <Link to="/deals" className="text-xs text-[#FF5722] font-semibold hover:underline">
            See All Flash Deals →
          </Link>
        </div>
      </div>
    </section>
  );
};

export default DealsCountdown;
