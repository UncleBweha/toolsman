import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const DealsCountdown = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 1, hours: 23, minutes: 45, seconds: 30 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { days, hours, minutes, seconds } = prev;
        if (seconds > 0) seconds--;
        else { seconds = 59; if (minutes > 0) minutes--;
          else { minutes = 59; if (hours > 0) hours--;
            else { hours = 23; if (days > 0) days--; } } }
        return { days, hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals-countdown"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, original_price, image_url")
        .eq("is_active", true)
        .not("original_price", "is", null)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data || []).filter((p) => p.original_price && p.original_price > p.price).slice(0, 5);
    },
  });

  if (!isLoading && !deals.length) return null;

  return (
    <section className="py-4 md:py-10 bg-background">
      <div className="container">
        <div className="flex flex-row items-center justify-between gap-3 mb-3 md:mb-5 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-2xl font-bold text-foreground">Daily Deals</h2>
            <Link to="/deals" className="text-sm text-primary font-medium hover:underline">See All →</Link>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <TimeBlock value={timeLeft.days} label="Days" />
            <TimeBlock value={timeLeft.hours} label="Hours" />
            <TimeBlock value={timeLeft.minutes} label="Min" />
            <TimeBlock value={timeLeft.seconds} label="Sec" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 md:gap-4">
            {deals.map((p) => (
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

const TimeBlock = ({ value, label }: { value: number; label: string }) => (
  <div className="bg-primary text-primary-foreground rounded-xl px-3 py-2 min-w-[52px] text-center">
    <div className="text-lg md:text-xl font-bold">{value.toString().padStart(2, "0")}</div>
    <div className="text-[10px] md:text-xs opacity-80">{label}</div>
  </div>
);

export default DealsCountdown;
