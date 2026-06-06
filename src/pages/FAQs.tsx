import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How do I place an order?",
    answer: "Simply browse our products, add items to your cart, and proceed to checkout. You can pay via M-Pesa or other available payment methods.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept M-Pesa (Lipa na M-Pesa), bank transfers, and cash on delivery for select locations in Nairobi.",
  },
  {
    question: "How long does delivery take?",
    answer: "Delivery within Nairobi takes 1-2 business days. Upcountry deliveries take 3-5 business days depending on your location.",
  },
  {
    question: "How are shipping costs calculated?",
    answer: "Shipping costs are calculated based on your location and the weight of your items during checkout.",
  },
  {
    question: "What is your return policy?",
    answer: "We accept returns within 7 days of delivery for unused items in original packaging. Please see our Return Policy page for full details.",
  },
  {
    question: "Are your products genuine?",
    answer: "Yes, all our products are 100% genuine and sourced directly from authorized distributors. We provide warranty on applicable products.",
  },
  {
    question: "Can I track my order?",
    answer: "Yes, once your order is shipped, you'll receive a tracking number via SMS and email to monitor your delivery.",
  },
  {
    question: "Do you offer bulk/wholesale pricing?",
    answer: "Yes, we offer special pricing for bulk orders. Please contact us directly for wholesale inquiries.",
  },
];

const FAQs = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Header />
      
      <main className="flex-1 container py-12">
        <h1 className="text-3xl font-bold mb-4">Frequently Asked Questions</h1>
        <p className="text-muted-foreground mb-8">
          Find answers to common questions about our products, orders, and services.
        </p>
        
        <Accordion type="single" collapsible className="max-w-3xl">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        
        <div className="mt-12 p-6 bg-muted/30 rounded-lg max-w-3xl">
          <h2 className="text-xl font-semibold mb-2">Still have questions?</h2>
          <p className="text-muted-foreground">
            Contact us at <strong>0724 652 455</strong> or email us at{" "}
            <strong>toolsmanstore@gmail.com</strong>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FAQs;
