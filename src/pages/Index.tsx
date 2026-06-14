import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroBanner from "@/components/home/HeroBanner";
import CategoryGrid from "@/components/home/CategoryGrid";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import DealsCountdown from "@/components/home/DealsCountdown";
import PromoBanners from "@/components/home/PromoBanners";
import TrustBadges from "@/components/home/TrustBadges";
import AnimatedSection from "@/components/home/AnimatedSection";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <HeroBanner />
        <AnimatedSection delay={0.05}>
          <CategoryGrid />
        </AnimatedSection>
        <AnimatedSection delay={0.1}>
          <FeaturedProducts title="New Tech for the Season" showBanner />
        </AnimatedSection>
        <AnimatedSection delay={0.05}>
          <PromoBanners />
        </AnimatedSection>
        <AnimatedSection delay={0.1}>
          <DealsCountdown />
        </AnimatedSection>
        <AnimatedSection delay={0.05}>
          <FeaturedProducts title="Best Sellers" />
        </AnimatedSection>
        <AnimatedSection delay={0.1}>
          <TrustBadges />
        </AnimatedSection>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
