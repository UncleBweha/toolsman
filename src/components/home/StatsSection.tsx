import { useEffect, useRef, useState } from "react";
import { Users, Package, Star, MapPin } from "lucide-react";

interface Stat {
  icon: typeof Users;
  value: number;
  suffix?: string;
  label: string;
  decimal?: boolean;
  text?: string; // override numeric display
}

const stats: Stat[] = [
  { icon: Users, value: 5000, suffix: "+", label: "Orders Delivered" },
  { icon: Package, value: 1000, suffix: "+", label: "Products Available" },
  { icon: Star, value: 4.8, suffix: "/5", label: "Customer Rating", decimal: true },
  { icon: MapPin, value: 0, label: "Trusted Across Kenya", text: "Nationwide" },
];

const Counter = ({ to, decimal, suffix, text }: { to: number; decimal?: boolean; suffix?: string; text?: string }) => {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (text) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1400;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setN(to * eased);
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, text]);

  if (text) return <span ref={ref}>{text}</span>;
  const display = decimal ? n.toFixed(1) : Math.round(n).toLocaleString("en-US");
  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
};

const StatsSection = () => {
  return (
    <section className="py-6 md:py-10 bg-white">
      <div className="container">
        <div className="rounded-2xl bg-[#0f172a] px-5 md:px-10 py-6 md:py-8 overflow-hidden relative">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#FF5722]/10 blur-3xl pointer-events-none" />
          <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-8">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-3 md:gap-4">
                <div className="flex-shrink-0 h-10 w-10 md:h-12 md:w-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  <s.icon className="h-5 w-5 md:h-6 md:w-6 text-[#FF5722]" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg md:text-2xl font-extrabold text-white leading-none">
                    <Counter to={s.value} decimal={s.decimal} suffix={s.suffix} text={s.text} />
                  </div>
                  <p className="text-[11px] md:text-xs text-white/60 mt-1 leading-snug">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
