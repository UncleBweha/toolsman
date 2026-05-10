-- =====================================================
-- Migration: System Assets Bucket for Watermark
-- =====================================================

-- Create system-assets storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'system-assets',
  'system-assets',
  true,
  5242880, -- 5MB
  ARRAY['image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for system-assets bucket
CREATE POLICY "Anyone can view system assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'system-assets');

CREATE POLICY "Admins can upload system assets" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'system-assets'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update system assets" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'system-assets'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete system assets" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'system-assets'
    AND public.has_role(auth.uid(), 'admin')
  );
