import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroBanner from "@/components/home/HeroBanner";
import CategoryGrid from "@/components/home/CategoryGrid";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import DealsCountdown from "@/components/home/DealsCountdown";
import PromoBanners from "@/components/home/PromoBanners";
import TrustBadges from "@/components/home/TrustBadges";
import AnimatedSection from "@/components/home/AnimatedSection";
import BrandStrip from "@/components/home/BrandStrip";

const SITE = "https://toolsman.lovable.app";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Toolsman — Professional Tools, Electronics & Equipment | Kenya</title>
        <meta name="description" content="Kenya's premium marketplace for tools, electronics, home appliances, and industrial equipment. Genuine brands like Bosch, Makita, Samsung, LG. Fast delivery, secure payment." />
        <link rel="canonical" href={`${SITE}/`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Toolsman",
            url: SITE,
            potentialAction: {
              "@type": "SearchAction",
              target: `${SITE}/search?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          })}
        </script>
      </Helmet>
      <Header />

      <main className="flex-1">
        <HeroBanner />
        <AnimatedSection delay={0.05}>
          <CategoryGrid />
        </AnimatedSection>
        <AnimatedSection delay={0.05}>
          <BrandStrip />
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

