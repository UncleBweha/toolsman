
-- ============ profiles: add name parts ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS middle_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

-- Best-effort backfill from full_name
UPDATE public.profiles
SET first_name = COALESCE(first_name, split_part(full_name, ' ', 1)),
    last_name  = COALESCE(last_name,
                   NULLIF(regexp_replace(full_name, '^\S+\s*', ''), ''))
WHERE full_name IS NOT NULL
  AND (first_name IS NULL OR last_name IS NULL);

-- ============ user_addresses ============
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text,
  full_name text NOT NULL,
  phone text NOT NULL,
  county text NOT NULL,
  town text NOT NULL,
  address text NOT NULL,
  apartment text,
  notes text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own addresses"
  ON public.user_addresses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user ON public.user_addresses(user_id);

CREATE TRIGGER update_user_addresses_updated_at
  BEFORE UPDATE ON public.user_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure single default per user
CREATE OR REPLACE FUNCTION public.enforce_single_default_address()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.user_addresses
       SET is_default = false
     WHERE user_id = NEW.user_id
       AND id <> NEW.id
       AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_addresses_single_default
  AFTER INSERT OR UPDATE OF is_default ON public.user_addresses
  FOR EACH ROW WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.enforce_single_default_address();

-- ============ user_payment_methods ============
CREATE TABLE IF NOT EXISTS public.user_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('mpesa','card')),
  label text,
  -- mpesa
  mpesa_number text,
  -- card (NEVER store PAN/CVV)
  card_last4 text,
  card_brand text,
  card_holder text,
  card_exp_month int,
  card_exp_year int,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own payment methods"
  ON public.user_payment_methods FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_payment_methods_user ON public.user_payment_methods(user_id);

CREATE TRIGGER update_user_payment_methods_updated_at
  BEFORE UPDATE ON public.user_payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enforce_single_default_payment()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.user_payment_methods
       SET is_default = false
     WHERE user_id = NEW.user_id
       AND id <> NEW.id
       AND type = NEW.type
       AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_payment_methods_single_default
  AFTER INSERT OR UPDATE OF is_default ON public.user_payment_methods
  FOR EACH ROW WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.enforce_single_default_payment();

-- ============ avatars storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete their own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
