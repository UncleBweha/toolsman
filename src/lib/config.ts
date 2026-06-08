// Global app configuration
export const SITE = {
  name: "Toolsman Store",
  url: "https://toolsman.co.ke",
  whatsappNumber: "254701043041", // E.164 without +
  whatsappDisplay: "+254 701 043041",
  supportEmail: "support@toolsman.co.ke",
};

export function buildWhatsAppOrderLink(opts: {
  productName: string;
  price: string;
  url: string;
}) {
  const message =
    `Hello there\n\n` +
    `I'd like to order this item from Toolsman Store.\n\n` +
    `Product Name: ${opts.productName}\n` +
    `Price: ${opts.price}\n` +
    `URL: ${opts.url}\n\n` +
    `Thank you!`;
  return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
