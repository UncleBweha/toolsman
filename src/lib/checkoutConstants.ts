export const KENYA_COUNTIES = [
  "Baringo","Bomet","Bungoma","Busia","Elgeyo-Marakwet","Embu","Garissa",
  "Homa Bay","Isiolo","Kajiado","Kakamega","Kericho","Kiambu","Kilifi",
  "Kirinyaga","Kisii","Kisumu","Kitui","Kwale","Laikipia","Lamu","Machakos",
  "Makueni","Mandera","Marsabit","Meru","Migori","Mombasa","Murang'a",
  "Nairobi","Nakuru","Nandi","Narok","Nyamira","Nyandarua","Nyeri",
  "Samburu","Siaya","Taita-Taveta","Tana River","Tharaka-Nithi","Trans Nzoia",
  "Turkana","Uasin Gishu","Vihiga","Wajir","West Pokot"
];

export const DELIVERY_FEES = {
  nairobi: { standard: 500, express: 1000 },
  other: { standard: 1000, express: 1500 },
};

export const DELIVERY_OPTIONS = {
  nairobi: [
    { id: "standard", label: "Standard Delivery", duration: "24–48 hrs", price: 500 },
    { id: "express", label: "Express Delivery", duration: "Same day / Next day", price: 1000 },
  ],
  other: [
    { id: "standard", label: "Standard Delivery", duration: "2–5 business days", price: 1000 },
    { id: "express", label: "Express Delivery", duration: "1–3 business days", price: 1500 },
  ],
};

export function getDeliveryFee(county: string, method: "standard" | "express"): number {
  const isNairobi = county.toLowerCase() === "nairobi";
  return isNairobi ? DELIVERY_FEES.nairobi[method] : DELIVERY_FEES.other[method];
}

export function getDeliveryOptions(county: string) {
  const isNairobi = county.toLowerCase() === "nairobi";
  return isNairobi ? DELIVERY_OPTIONS.nairobi : DELIVERY_OPTIONS.other;
}

export const CHECKOUT_SESSION_KEY = "toolsman_checkout_state";

export function validateKenyanPhone(phone: string): boolean {
  // Accepts: 07XXXXXXXX, 01XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX
  const cleaned = phone.replace(/\s+/g, "");
  return /^(\+?254|0)[17]\d{8}$/.test(cleaned);
}

// Strip dangerous characters but PRESERVE spaces (incl. leading/trailing during typing).
// Trim only when validating/submitting, not during onChange.
export function sanitizeInput(value: string): string {
  return value.replace(/[<>'"]/g, "").slice(0, 500);
}
