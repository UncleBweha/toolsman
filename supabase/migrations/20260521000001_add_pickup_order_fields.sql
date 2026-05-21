-- Migration: Add in-store pickup fields to orders table
-- Run this in Supabase SQL editor or via supabase db push

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS is_pickup_order  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pickup_branch_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pickup_branch_name TEXT DEFAULT NULL;

-- Index for filtering pickup orders in admin
CREATE INDEX IF NOT EXISTS idx_orders_is_pickup ON orders (is_pickup_order)
  WHERE is_pickup_order = TRUE;

COMMENT ON COLUMN orders.is_pickup_order    IS 'True when customer chose in-store pickup instead of delivery';
COMMENT ON COLUMN orders.pickup_branch_id   IS 'Branch ID (e.g. hq, westlands, mombasa)';
COMMENT ON COLUMN orders.pickup_branch_name IS 'Human-readable branch name for display';
