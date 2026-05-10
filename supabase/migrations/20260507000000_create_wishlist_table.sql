-- Create wishlist table
CREATE TABLE IF NOT EXISTS public.wishlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, product_id)
);

-- Enable Row Level Security
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

-- Users can only see their own wishlist items
CREATE POLICY "Users can view own wishlist"
  ON public.wishlist FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own wishlist items
CREATE POLICY "Users can add to own wishlist"
  ON public.wishlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own wishlist items
CREATE POLICY "Users can remove from own wishlist"
  ON public.wishlist FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS wishlist_user_id_idx ON public.wishlist(user_id);
CREATE INDEX IF NOT EXISTS wishlist_product_id_idx ON public.wishlist(product_id);
