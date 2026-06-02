-- Add VAT/eTIMS and pickup-order columns to orders so checkout can persist
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS vat_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vat_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kra_pin TEXT,
  ADD COLUMN IF NOT EXISTS tax_name TEXT,
  ADD COLUMN IF NOT EXISTS etims_invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS receipt_status TEXT,
  ADD COLUMN IF NOT EXISTS is_pickup_order BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pickup_branch_id TEXT,
  ADD COLUMN IF NOT EXISTS pickup_branch_name TEXT;