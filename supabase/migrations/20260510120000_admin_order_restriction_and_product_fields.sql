-- =====================================================
-- Migration: Admin order restriction + Product enhancements
-- =====================================================

-- 1. Block admin users from creating orders
-- Drop existing INSERT policy and replace with one that excludes admins
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
CREATE POLICY "Non-admin users can create their own orders" ON public.orders
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND NOT public.has_role(auth.uid(), 'admin')
  );

-- 2. Add new product fields
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS key_features TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- 3. Create admin_audit_log table for activity tracking
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.admin_audit_log
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_log
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Create import_history table
CREATE TABLE IF NOT EXISTS public.import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  errors JSONB DEFAULT '[]',
  imported_product_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view import history" ON public.import_history
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage import history" ON public.import_history
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 5. Create product_images storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for product-images bucket
CREATE POLICY "Anyone can view product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update product images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'product-images'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete product images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'product-images'
    AND public.has_role(auth.uid(), 'admin')
  );
