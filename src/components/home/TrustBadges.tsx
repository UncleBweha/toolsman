import { ShieldCheck, Truck, Lock, RefreshCw, Headphones } from "lucide-react";

const badges = [
  { icon: ShieldCheck, title: "Genuine Products", desc: "100% authentic quality products" },
  { icon: Truck, title: "Fast Delivery", desc: "Nationwide delivery across Kenya" },
  { icon: Lock, title: "Secure Payments", desc: "Safe & secure payment methods" },
  { icon: RefreshCw, title: "Easy Returns", desc: "7-day easy return policy" },
  { icon: Headphones, title: "Expert Support", desc: "We're here to help you succeed" },
];

const TrustBadges = () => {
  return (
    <section className="py-6 md:py-10 bg-white">
      <div className="container">
        <div className="rounded-2xl border border-gray-200 bg-gray-50/60 px-4 md:px-8 py-5 md:py-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 md:gap-6">
            {badges.map((b) => (
              <div key={b.title} className="flex items-start gap-3">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                  <b.icon className="h-5 w-5 text-[#FF5722]" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-gray-900 leading-tight">{b.title}</h4>
                  <p className="text-[11px] md:text-xs text-gray-500 mt-0.5 leading-snug">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
