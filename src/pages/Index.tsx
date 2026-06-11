import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroBanner from "@/components/home/HeroBanner";
import CategoryGrid from "@/components/home/CategoryGrid";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import DealsCountdown from "@/components/home/DealsCountdown";
import TrustBadges from "@/components/home/TrustBadges";
import StatsSection from "@/components/home/StatsSection";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
        <HeroBanner />
        <CategoryGrid />
        <FeaturedProducts title="Featured Products" />
        <DealsCountdown />
        <TrustBadges />
        <StatsSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
