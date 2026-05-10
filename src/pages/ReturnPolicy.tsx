import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const ReturnPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Header />
      
      <main className="flex-1 container py-12">
        <h1 className="text-3xl font-bold mb-8">Return Policy</h1>
        
        <div className="prose prose-lg max-w-3xl">
          <h2 className="text-2xl font-semibold mt-8 mb-4">Return Period</h2>
          <p className="text-muted-foreground mb-6">
            We accept returns within 7 days of delivery. Items must be unused, in original 
            packaging, and in resalable condition.
          </p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Eligible for Return</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
            <li>Defective or damaged products</li>
            <li>Wrong item delivered</li>
            <li>Product not as described</li>
            <li>Unused items in original packaging</li>
          </ul>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Not Eligible for Return</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
            <li>Used or opened items</li>
            <li>Items without original packaging</li>
            <li>Consumable products (oils, lubricants, etc.)</li>
            <li>Custom or special order items</li>
          </ul>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">How to Return</h2>
          <ol className="list-decimal list-inside text-muted-foreground space-y-2 mb-6">
            <li>Contact us at 0724 652 455 or toolsmanstore@gmail.com</li>
            <li>Provide your order number and reason for return</li>
            <li>We'll provide return instructions and pickup arrangement</li>
            <li>Once received and inspected, refund will be processed within 3-5 business days</li>
          </ol>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Refunds</h2>
          <p className="text-muted-foreground mb-6">
            Refunds will be processed to the original payment method. M-Pesa refunds are 
            processed within 24-48 hours. Bank transfers may take 3-5 business days.
          </p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Warranty Claims</h2>
          <p className="text-muted-foreground">
            For warranty claims on defective products, please contact us with proof of purchase. 
            Warranty terms vary by product and manufacturer.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ReturnPolicy;
