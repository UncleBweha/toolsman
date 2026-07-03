import { Truck, Shield, RefreshCw, Headphones } from "lucide-react";

const badges = [
  { icon: Shield, title: "100% Genuine Products", description: "Quality you can trust" },
  { icon: Truck, title: "Fast Delivery", description: "Nationwide delivery" },
  { icon: RefreshCw, title: "Easy Returns", description: "7-day return policy" },
  { icon: Headphones, title: "Expert Support", description: "We're here to help" },
];

const TrustBadges = () => {
  return (
    <section className="py-5 md:py-8 bg-white border-t border-gray-100">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {badges.map((badge) => (
            <div key={badge.title} className="flex items-center gap-3">
              <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-[#FF5722]/8 flex items-center justify-center">
                <badge.icon className="h-5 w-5 text-[#FF5722]" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">{badge.title}</h4>
                <p className="text-xs text-gray-500">{badge.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
