-- ============================================================
-- Migration: Tags, VAT/eTIMS, and SEO enhancements
-- Created: 2026-05-21
-- ============================================================

-- ── PRODUCTS TABLE ADDITIONS ──────────────────────────────────

-- Auto-generated tags (NLP-extracted from description)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS generated_tags text[] DEFAULT '{}';

-- SEO fields
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS seo_title text;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS seo_description text;

-- ── ORDERS TABLE ADDITIONS ────────────────────────────────────

-- VAT / eTIMS columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS vat_enabled boolean DEFAULT false;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS vat_amount numeric(12, 2) DEFAULT 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS kra_pin text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tax_name text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS etims_invoice_number text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS receipt_status text DEFAULT 'pending'
    CHECK (receipt_status IN ('pending', 'generated', 'sent', 'failed'));

-- ── INDEXES ───────────────────────────────────────────────────

-- GIN index for fast tag search
CREATE INDEX IF NOT EXISTS idx_products_generated_tags
  ON public.products USING GIN (generated_tags);

CREATE INDEX IF NOT EXISTS idx_products_tags
  ON public.products USING GIN (tags);

-- Index for KRA PIN lookups (admin search)
CREATE INDEX IF NOT EXISTS idx_orders_kra_pin
  ON public.orders (kra_pin)
  WHERE kra_pin IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_vat_enabled
  ON public.orders (vat_enabled)
  WHERE vat_enabled = true;

-- ── COMMENTS ──────────────────────────────────────────────────
COMMENT ON COLUMN public.products.generated_tags IS 'Auto-extracted NLP tags from product description — do not manually edit via SQL';
COMMENT ON COLUMN public.products.seo_title IS 'Optional override for the HTML <title> tag on the product page';
COMMENT ON COLUMN public.products.seo_description IS 'Optional override for the meta description on the product page';
COMMENT ON COLUMN public.orders.vat_enabled IS 'True when customer opted in to VAT/eTIMS receipt at checkout';
COMMENT ON COLUMN public.orders.vat_amount IS 'Calculated VAT amount (16% of subtotal) when vat_enabled is true';
COMMENT ON COLUMN public.orders.kra_pin IS 'Customer KRA PIN for eTIMS receipt generation';
COMMENT ON COLUMN public.orders.tax_name IS 'Registered business/personal name for eTIMS receipt';
COMMENT ON COLUMN public.orders.etims_invoice_number IS 'Unique eTIMS invoice reference number';
COMMENT ON COLUMN public.orders.receipt_status IS 'Lifecycle status of the eTIMS receipt: pending | generated | sent | failed';
