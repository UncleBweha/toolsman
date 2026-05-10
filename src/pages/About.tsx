import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const About = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Header />
      
      <main className="flex-1 container py-12">
        <h1 className="text-3xl font-bold mb-8">About Toolsman</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-muted-foreground mb-6">
            Welcome to Toolsman, your trusted partner for professional tools and equipment in Kenya. 
            We are dedicated to providing high-quality products at competitive prices, backed by 
            exceptional customer service.
          </p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Our Mission</h2>
          <p className="text-muted-foreground mb-6">
            To empower professionals and DIY enthusiasts with the best tools and equipment, 
            making every project easier and more efficient.
          </p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Why Choose Us?</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
            <li>Wide selection of quality tools from trusted brands</li>
            <li>Competitive prices with regular deals and offers</li>
            <li>Fast and reliable delivery across Kenya</li>
            <li>Expert customer support</li>
            <li>Genuine products with warranty</li>
          </ul>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Visit Our Store</h2>
          <p className="text-muted-foreground">
            Simara Mall, 6th Floor Shop 03, Nairobi<br />
            Phone: 0724 652 455<br />
            Email: toolsmanstore@gmail.com
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;
