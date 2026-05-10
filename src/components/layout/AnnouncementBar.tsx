import { Truck, Award, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

const items = [
  { Icon: Truck, label: "NATIONWIDE DELIVERY", sub: "fast & reliable" },
  { Icon: Award, label: "QUALITY GUARANTEE", sub: "pro-grade tools" },
  { Icon: ShieldCheck, label: "SECURE PAYMENT", sub: "100% protected" },
];

const AnnouncementBar = () => {
  return (
    <div className="bg-[#0f172a] text-white text-xs">
      {/* Desktop: full row */}
      <div className="hidden md:block py-2">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-8">
            {items.map(({ Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="font-semibold">{label}</span>
                <span className="text-gray-300">{sub}</span>
              </div>
            ))}
          </div>
          <Link to="/contact" className="hover:text-gray-300 transition-colors">
            Help &amp; Support
          </Link>
        </div>
      </div>

      {/* Mobile/tablet: compact marquee */}
      <div className="md:hidden overflow-hidden h-7 flex items-center">
        <div className="flex gap-8 whitespace-nowrap animate-[marquee_22s_linear_infinite] will-change-transform pl-4">
          {[...items, ...items, ...items].map(({ Icon, label, sub }, i) => (
            <span key={i} className="flex items-center gap-1.5 text-[11px]">
              <Icon className="h-3 w-3" />
              <span className="font-semibold">{label}</span>
              <span className="text-gray-400">· {sub}</span>
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
};

export default AnnouncementBar;
