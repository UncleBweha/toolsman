import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Wrench } from "lucide-react";

const PromoBanners = () => {
  return (
    <section className="py-4 md:py-8 bg-white">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Banner 1: Power Tools */}
          <div className="relative bg-[#0B1D3A] text-white p-6 md:p-8 rounded-xl flex flex-col justify-between min-h-[180px] md:min-h-[220px] overflow-hidden group shadow-sm hover:shadow-md transition-all duration-300">
            {/* Background pattern */}
            <div className="absolute right-0 bottom-0 opacity-10 translate-x-1/4 translate-y-1/4 pointer-events-none group-hover:scale-110 transition-transform duration-500">
              <Wrench className="h-48 w-48 text-white" />
            </div>

            <div className="space-y-2 max-w-[70%] relative z-10">
              <span className="text-[10px] font-bold text-[#FF5722] tracking-widest uppercase">
                High Performance
              </span>
              <h3 className="text-lg md:text-2xl font-extrabold text-white leading-tight">
                Professional Power Tools
              </h3>
              <p className="text-xs text-gray-300 font-medium leading-relaxed">
                Industrial drills, grinders & saws built to last.
              </p>
            </div>

            <div className="mt-4 md:mt-0 relative z-10">
              <Link
                to="/category/power-hand-tools"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF5722] hover:text-white transition-colors"
              >
                Explore Range <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Banner 2: Safety & PPE */}
          <div className="relative bg-gray-50 border border-gray-200 text-gray-900 p-6 md:p-8 rounded-xl flex flex-col justify-between min-h-[180px] md:min-h-[220px] overflow-hidden group shadow-sm hover:shadow-md transition-all duration-300">
            {/* Background pattern */}
            <div className="absolute right-0 bottom-0 opacity-5 translate-x-1/4 translate-y-1/4 pointer-events-none group-hover:scale-110 transition-transform duration-500">
              <ShieldCheck className="h-48 w-48 text-gray-900" />
            </div>

            <div className="space-y-2 max-w-[70%] relative z-10">
              <span className="text-[10px] font-bold text-[#FF5722] tracking-widest uppercase">
                Safety First
              </span>
              <h3 className="text-lg md:text-2xl font-extrabold text-gray-900 leading-tight">
                Verified PPE & Wearables
              </h3>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                Protect your workforce with premium quality safety wear.
              </p>
            </div>

            <div className="mt-4 md:mt-0 relative z-10">
              <Link
                to="/category/safety-ware-ppe"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF5722] hover:text-[#0B1D3A] transition-colors"
              >
                Shop Safety Essentials <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromoBanners;
