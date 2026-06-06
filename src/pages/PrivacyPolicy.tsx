import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Header />
      
      <main className="flex-1 container py-12">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-lg max-w-3xl">
          <p className="text-muted-foreground mb-6">
            Last updated: January 2026
          </p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Information We Collect</h2>
          <p className="text-muted-foreground mb-4">We collect information you provide directly:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
            <li>Name, email, and phone number</li>
            <li>Delivery address</li>
            <li>Payment information (processed securely via M-Pesa)</li>
            <li>Order history and preferences</li>
          </ul>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">How We Use Your Information</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
            <li>Process and deliver your orders</li>
            <li>Send order updates and tracking information</li>
            <li>Provide customer support</li>
            <li>Send promotional offers (with your consent)</li>
            <li>Improve our services</li>
          </ul>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Information Security</h2>
          <p className="text-muted-foreground mb-6">
            We implement appropriate security measures to protect your personal information. 
            Payment processing is handled securely through M-Pesa and we do not store your 
            payment details on our servers.
          </p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Information Sharing</h2>
          <p className="text-muted-foreground mb-6">
            We do not sell or rent your personal information. We may share your information 
            with delivery partners solely for order fulfillment purposes.
          </p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Your Rights</h2>
          <p className="text-muted-foreground mb-6">
            You have the right to access, correct, or delete your personal information. 
            Contact us at toolsmanstore@gmail.com for any privacy-related requests.
          </p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Us</h2>
          <p className="text-muted-foreground">
            For questions about this privacy policy, contact us at:<br />
            Email: toolsmanstore@gmail.com<br />
            Phone: 0724 652 455<br />
            Address: Simara Mall, 6th Floor Shop 03, Nairobi
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
