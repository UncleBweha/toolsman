-- Fix: Products RLS policy was using FOR ALL with only USING clause
-- PostgreSQL requires WITH CHECK for INSERT operations separately
-- The FOR ALL with only USING silently blocks INSERT for admins

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

-- Separate policies per operation for correctness
CREATE POLICY "Admins can insert products" ON public.products
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update products" ON public.products
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete products" ON public.products
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Also allow admins to select ALL products (including inactive)
CREATE POLICY "Admins can view all products" ON public.products
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Fix same issue on categories table
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

CREATE POLICY "Admins can insert categories" ON public.categories
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update categories" ON public.categories
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete categories" ON public.categories
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all categories" ON public.categories
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
