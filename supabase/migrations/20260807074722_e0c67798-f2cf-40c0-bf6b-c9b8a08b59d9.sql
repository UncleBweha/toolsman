CREATE TABLE IF NOT EXISTS public.mpesa_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkout_request_id text not null unique,
  merchant_request_id text,
  phone text not null,
  amount numeric not null,
  status text not null default 'pending',
  result_code text,
  result_desc text,
  mpesa_receipt_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT ON public.mpesa_transactions TO authenticated;
GRANT ALL ON public.mpesa_transactions TO service_role;

ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own mpesa transactions" ON public.mpesa_transactions;
CREATE POLICY "Users can view their own mpesa transactions"
  ON public.mpesa_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all mpesa transactions" ON public.mpesa_transactions;
CREATE POLICY "Admins can view all mpesa transactions"
  ON public.mpesa_transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_mpesa_transactions_updated_at ON public.mpesa_transactions;
CREATE TRIGGER update_mpesa_transactions_updated_at
  BEFORE UPDATE ON public.mpesa_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_user ON public.mpesa_transactions(user_id);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text,
  ADD COLUMN IF NOT EXISTS mpesa_checkout_request_id text,
  ADD COLUMN IF NOT EXISTS mpesa_receipt_number text,
  ADD COLUMN IF NOT EXISTS mpesa_phone text;