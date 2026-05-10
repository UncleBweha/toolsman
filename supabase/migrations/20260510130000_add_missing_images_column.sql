-- =====================================================
-- Migration: Add missing images array to products
-- =====================================================

ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
