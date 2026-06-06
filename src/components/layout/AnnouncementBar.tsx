import { useLocation } from "react-router-dom";
import { Phone, Zap } from "lucide-react";

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <path
      d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      fill="currentColor"
    />
  </svg>
);

const TickerItem = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-5 px-5">
    {children}
  </span>
);

const AnnouncementBar = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) return null;

  const trustContent = (
    <>
      <TickerItem>
        <span className="text-white text-[10px] font-bold uppercase tracking-wider">Fast Delivery</span>
        <span className="text-white/40">•</span>
        <span className="text-white text-[10px] font-bold uppercase tracking-wider">Genuine Products</span>
        <span className="text-white/40">•</span>
        <span className="text-white text-[10px] font-bold uppercase tracking-wider">Competitive Prices</span>
        <span className="text-white/40">•</span>
        <span className="text-white text-[10px] font-bold uppercase tracking-wider">Nationwide Shipping</span>
        <span className="text-white/40">•</span>
        <span className="text-white text-[10px] font-bold uppercase tracking-wider">Secure Payment</span>
        <span className="text-white/40">•</span>
      </TickerItem>
    </>
  );

  return (
    <>
      {/* ── Sticky Main Bar ── */}
      <div className="sticky top-0 z-[60] bg-black relative overflow-hidden h-12 md:h-14">
        {/* Animated diagonal stripe background */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              #FF5722 10px,
              #FF5722 20px
            )`,
          }}
        />

        {/* Subtle orange glow behind phone number */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-14 bg-[#FF5722]/10 blur-3xl rounded-full pointer-events-none" />

        <div className="container relative h-full flex items-center justify-between">
          {/* Left: CTA badges (desktop) */}
          <div className="hidden md:flex items-center gap-2.5 flex-shrink-0">
            <span className="inline-flex items-center gap-1 bg-[#FF5722] text-white text-[10px] font-black px-2 py-1 rounded-sm uppercase tracking-widest animate-pulse shadow-[0_0_12px_rgba(255,87,34,0.5)]">
              <Zap className="h-3 w-3" />
              Call Now
            </span>
            <span className="text-yellow-400 text-[11px] font-bold uppercase tracking-wider">
              Order Directly
            </span>
          </div>

          {/* Center: Phone number (hero) */}
          <a
            href="tel:+254701043041"
            className="flex items-center gap-2 md:gap-3 group mx-auto md:mx-0"
          >
            <Phone className="h-5 w-5 md:h-6 md:w-6 text-[#FF5722] transition-colors duration-300 group-hover:text-white" />
            <span className="text-white font-black text-2xl md:text-3xl tracking-wide drop-shadow-[0_0_14px_rgba(255,87,34,0.6)] transition-colors duration-300 group-hover:text-[#FF5722]">
              0701 043 041
            </span>
          </a>

          {/* Right: WhatsApp + Guarantees (desktop) */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            <a
              href="https://wa.me/254701043041"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20BA5C] text-white font-bold text-[11px] px-3 py-1.5 rounded transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#25D366]/30"
            >
              <WhatsAppIcon className="h-3.5 w-3.5" />
              WhatsApp
            </a>
            <div className="text-right leading-tight">
              <span className="block text-white/70 text-[10px] font-bold uppercase tracking-wider">
                Fast Response
              </span>
              <span className="block text-white/40 text-[9px] font-medium uppercase tracking-wider">
                Guaranteed
              </span>
            </div>
          </div>

          {/* Mobile: WhatsApp icon */}
          <a
            href="https://wa.me/254701043041"
            target="_blank"
            rel="noopener noreferrer"
            className="md:hidden flex-shrink-0 ml-2 p-1.5 rounded-full hover:bg-white/10 transition-colors active:scale-95"
            aria-label="Chat on WhatsApp"
          >
            <WhatsAppIcon className="h-6 w-6 text-[#25D366]" />
          </a>
        </div>
      </div>

      {/* ── Desktop Ticker: Trust Badges (scrolls away, not sticky) ── */}
      <div className="hidden md:block bg-[#FF5722] h-5 overflow-hidden relative">
        <div className="flex items-center h-full animate-[announcement-ticker_22s_linear_infinite] whitespace-nowrap will-change-transform">
          {trustContent}
          {trustContent}
        </div>
      </div>

      <style>{`
        @keyframes announcement-ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </>
  );
};

export default AnnouncementBar;
