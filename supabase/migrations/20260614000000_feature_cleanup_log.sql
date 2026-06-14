-- ============================================================
-- Migration: Feature Cleanup Audit Log Table
-- ============================================================
-- Creates a persistent log table to track all key_features
-- migration runs, including which products were changed and
-- their before/after state. This is the permanent audit trail.

CREATE TABLE IF NOT EXISTS public.feature_cleanup_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  dry_run       BOOLEAN NOT NULL DEFAULT false,
  total_scanned INTEGER NOT NULL DEFAULT 0,
  total_changed INTEGER NOT NULL DEFAULT 0,
  product_ids   UUID[] DEFAULT '{}',
  details       JSONB DEFAULT '[]',
  rolled_back   BOOLEAN DEFAULT false,
  rolled_back_at TIMESTAMP WITH TIME ZONE,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_cleanup_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view feature cleanup logs"
  ON public.feature_cleanup_log
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert logs
CREATE POLICY "Admins can insert feature cleanup logs"
  ON public.feature_cleanup_log
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update (for rollback marking)
CREATE POLICY "Admins can update feature cleanup logs"
  ON public.feature_cleanup_log
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for quick lookups by run date
CREATE INDEX IF NOT EXISTS idx_feature_cleanup_log_run_at
  ON public.feature_cleanup_log (run_at DESC);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
