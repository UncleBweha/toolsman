/**
 * vatUtils.ts
 * KRA PIN validation, VAT calculation, and eTIMS receipt helpers.
 */

export const VAT_RATE = 0.16; // 16% VAT

/** KRA PIN format: Letter + 9 digits + Letter (e.g. A123456789B) */
const KRA_PIN_REGEX = /^[A-Z]\d{9}[A-Z]$/i;

export interface VatInfo {
  enabled: boolean;
  kraPin: string;
  taxName: string;
}

export interface VatCalculation {
  subtotal: number;
  vatAmount: number;
  totalWithVat: number;
}

/**
 * Validate a KRA PIN string.
 * Returns true if it matches the standard Kenyan KRA PIN format.
 */
export function validateKraPin(pin: string): boolean {
  if (!pin) return false;
  const cleaned = pin.trim().toUpperCase();
  return KRA_PIN_REGEX.test(cleaned);
}

/**
 * Format a KRA PIN to uppercase.
 */
export function formatKraPin(pin: string): string {
  return pin.trim().toUpperCase();
}

/**
 * Calculate VAT breakdown.
 */
export function calculateVat(subtotal: number): VatCalculation {
  const vatAmount = Math.round(subtotal * VAT_RATE * 100) / 100;
  const totalWithVat = subtotal + vatAmount;
  return { subtotal, vatAmount, totalWithVat };
}

/**
 * Generate a unique eTIMS invoice number.
 * Format: ETIMS-YYYYMMDD-XXXXXX (e.g. ETIMS-20260521-AB1234)
 */
export function generateEtimsInvoiceNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ETIMS-${date}-${rand}`;
}

/**
 * Format a currency amount in KSh.
 */
export function formatKsh(amount: number): string {
  return `KSh ${Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
