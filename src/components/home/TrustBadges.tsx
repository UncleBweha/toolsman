import { Truck, Shield, RefreshCw, Headphones } from "lucide-react";

const badges = [
  { icon: Shield, title: "100% Genuine Products", description: "Quality you can trust" },
  { icon: Truck, title: "Fast Delivery", description: "Nationwide delivery" },
  { icon: RefreshCw, title: "Easy Returns", description: "7-day return policy" },
  { icon: Headphones, title: "Expert Support", description: "We're here to help" },
];

const TrustBadges = () => {
  return (
    <section className="py-4 md:py-10 bg-background">
      <div className="container">
        <div className="bg-background rounded-2xl shadow-sm border border-border p-3 md:p-7">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            {badges.map((badge) => (
              <div key={badge.title} className="flex items-center gap-3">
                <div className="flex-shrink-0 h-12 w-12 rounded-2xl bg-background shadow-sm border border-border flex items-center justify-center">
                  <badge.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">
                    {badge.title}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {badge.description}
                  </p>
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
