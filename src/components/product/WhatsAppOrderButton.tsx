import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { buildWhatsAppOrderLink } from "@/lib/config";

interface Props {
  productName: string;
  price: string;
  url: string;
  className?: string;
}

export const WhatsAppOrderButton = ({ productName, price, url, className = "" }: Props) => {
  const href = buildWhatsAppOrderLink({ productName, price, url });
  return (
    <Button
      asChild
      className={`w-full bg-[#25D366] hover:bg-[#1EBE5D] active:bg-[#17a34a] text-white h-10 font-bold shadow-none text-xs rounded-md transition-colors ${className}`}
    >
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Order via WhatsApp">
        <MessageCircle className="h-4 w-4 mr-2 flex-shrink-0" />
        ORDER ON WHATSAPP
      </a>
    </Button>
  );
};

export default WhatsAppOrderButton;
