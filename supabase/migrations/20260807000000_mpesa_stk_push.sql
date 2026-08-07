-- Lipa Na M-Pesa Express (STK Push) support

-- Track every STK push attempt independently of orders, since the push
-- happens during the Payment step, before an order row exists.
CREATE TABLE public.mpesa_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  checkout_request_id TEXT NOT NULL UNIQUE,
  merchant_request_id TEXT,
  phone TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | success | failed | cancelled
  result_code TEXT,
  result_desc TEXT,
  mpesa_receipt_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;

-- Users can see their own STK push attempts (for polling status client-side)
CREATE POLICY "Users can view their own mpesa transactions" ON public.mpesa_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Only edge functions (service role) insert/update rows; no direct client writes
CREATE POLICY "Admins can view all mpesa transactions" ON public.mpesa_transactions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_mpesa_transactions_updated_at
  BEFORE UPDATE ON public.mpesa_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_mpesa_transactions_checkout_request_id ON public.mpesa_transactions(checkout_request_id);
CREATE INDEX idx_mpesa_transactions_user_id ON public.mpesa_transactions(user_id);

-- Payment tracking fields on orders
ALTER TABLE public.orders
  ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | failed
  ADD COLUMN mpesa_checkout_request_id TEXT,
  ADD COLUMN mpesa_receipt_number TEXT,
  ADD COLUMN mpesa_phone TEXT;

-- Back-link mpesa_transactions.order_id once the order is placed, without
-- granting clients an UPDATE policy on mpesa_transactions (which would let
-- a user tamper with their own transaction's status/receipt fields).
CREATE OR REPLACE FUNCTION public.link_mpesa_transaction_to_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.mpesa_checkout_request_id IS NOT NULL THEN
    UPDATE public.mpesa_transactions
    SET order_id = NEW.id
    WHERE checkout_request_id = NEW.mpesa_checkout_request_id
      AND user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER link_mpesa_transaction_after_order_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.link_mpesa_transaction_to_order();
