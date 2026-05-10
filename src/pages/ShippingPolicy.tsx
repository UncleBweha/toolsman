import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const ShippingPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Header />
      
      <main className="flex-1 container py-12">
        <h1 className="text-3xl font-bold mb-8">Shipping Policy</h1>
        
        <div className="prose prose-lg max-w-3xl">
          <h2 className="text-2xl font-semibold mt-8 mb-4">Delivery Areas</h2>
          <p className="text-muted-foreground mb-6">
            We deliver to all locations within Kenya. Delivery times and costs vary depending on your location.
          </p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Delivery Times</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
            <li><strong>Nairobi CBD & Environs:</strong> Same day or next business day</li>
            <li><strong>Greater Nairobi:</strong> 1-2 business days</li>
            <li><strong>Major Towns:</strong> 2-3 business days</li>
            <li><strong>Other Areas:</strong> 3-5 business days</li>
          </ul>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Shipping Costs</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
            <li><strong>Standard Shipping:</strong> Calculated at checkout based on location</li>
            <li><strong>Nairobi:</strong> KSh 200 - 500 depending on location</li>
            <li><strong>Upcountry:</strong> KSh 300 - 1,000 depending on location and weight</li>
          </ul>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Order Processing</h2>
          <p className="text-muted-foreground mb-6">
            Orders are processed within 24 hours of payment confirmation. You will receive an SMS 
            and email with tracking information once your order is dispatched.
          </p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Pickup Option</h2>
          <p className="text-muted-foreground mb-6">
            You can also pick up your order from our store at Simara Mall, 6th Floor Shop 03, Nairobi. 
            Pickup is free of charge.
          </p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Us</h2>
          <p className="text-muted-foreground">
            For shipping inquiries, contact us at 0724 652 455 or toolsmanstore@gmail.com
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ShippingPolicy;
