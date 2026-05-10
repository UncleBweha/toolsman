import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { buildWhatsAppOrderLink } from "@/lib/config";

interface Props {
  productName: string;
  price: string;
  url: string;
}

export const WhatsAppOrderButton = ({ productName, price, url }: Props) => {
  const href = buildWhatsAppOrderLink({ productName, price, url });
  return (
    <Button
      asChild
      className="flex-1 bg-[#25D366] hover:bg-[#1EBE5D] text-white h-12 font-bold shadow-none"
    >
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Order via WhatsApp">
        <MessageCircle className="h-5 w-5 mr-2" />
        ORDER ON WHATSAPP
      </a>
    </Button>
  );
};

export default WhatsAppOrderButton;
