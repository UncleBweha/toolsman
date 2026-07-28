
-- =========================================================================
-- 1. Products: add rating + review_count
-- =========================================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS rating numeric(3,2),
  ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products (brand);
CREATE INDEX IF NOT EXISTS idx_products_rating ON public.products (rating);
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products (stock_quantity);

-- =========================================================================
-- 2. Brands table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  logo_url text,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.brands TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT ALL ON public.brands TO service_role;

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands are publicly viewable" ON public.brands;
CREATE POLICY "Brands are publicly viewable"
  ON public.brands FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage brands" ON public.brands;
CREATE POLICY "Admins can manage brands"
  ON public.brands FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_brands_updated_at ON public.brands;
CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 3. Search queries — trending / popular search log
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.search_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL UNIQUE,
  count integer NOT NULL DEFAULT 1,
  last_searched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_queries_count ON public.search_queries (count DESC);
CREATE INDEX IF NOT EXISTS idx_search_queries_recent ON public.search_queries (last_searched_at DESC);

GRANT SELECT ON public.search_queries TO anon, authenticated;
GRANT INSERT, UPDATE ON public.search_queries TO anon, authenticated;
GRANT ALL ON public.search_queries TO service_role;

ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Search queries are publicly viewable" ON public.search_queries;
CREATE POLICY "Search queries are publicly viewable"
  ON public.search_queries FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can log a search" ON public.search_queries;
CREATE POLICY "Anyone can log a search"
  ON public.search_queries FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can increment search count" ON public.search_queries;
CREATE POLICY "Anyone can increment search count"
  ON public.search_queries FOR UPDATE USING (true) WITH CHECK (true);

-- Helper: upsert-and-increment search query
CREATE OR REPLACE FUNCTION public.log_search_query(_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean text;
BEGIN
  clean := lower(btrim(_query));
  IF clean = '' OR length(clean) < 2 OR length(clean) > 100 THEN RETURN; END IF;
  INSERT INTO public.search_queries (query, count, last_searched_at)
  VALUES (clean, 1, now())
  ON CONFLICT (query)
  DO UPDATE SET count = public.search_queries.count + 1,
                last_searched_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_search_query(text) TO anon, authenticated;

-- =========================================================================
-- 4. Seed missing top-level categories + subcategories
--    (merge-safe: uses ON CONFLICT (slug) DO NOTHING)
-- =========================================================================

-- Helper to insert a parent category and return its id
CREATE OR REPLACE FUNCTION public._seed_category(_name text, _parent uuid, _order int)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  _slug text;
  _id uuid;
BEGIN
  _slug := regexp_replace(lower(_name), '[^a-z0-9]+', '-', 'g');
  _slug := btrim(_slug, '-');
  -- If a category with the same name (case-insensitive) already exists at this level, use it
  SELECT id INTO _id FROM public.categories
    WHERE lower(name) = lower(_name)
      AND ((_parent IS NULL AND parent_id IS NULL) OR parent_id = _parent)
    LIMIT 1;
  IF _id IS NOT NULL THEN RETURN _id; END IF;
  -- Otherwise insert
  INSERT INTO public.categories (name, slug, parent_id, display_order, is_active)
  VALUES (_name, _slug, _parent, _order, true)
  ON CONFLICT (slug) DO UPDATE SET display_order = EXCLUDED.display_order
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

DO $$
DECLARE
  c_tools uuid; c_electronics uuid; c_phone uuid; c_computers uuid;
  c_electrical uuid; c_solar uuid; c_plumbing uuid; c_locks uuid;
  c_appliances uuid; c_kitchen uuid; c_furniture uuid; c_auto uuid;
  c_office uuid; c_lab uuid; c_health uuid; c_home uuid;
  c_sports uuid; c_baby uuid; c_pet uuid; c_fashion uuid;
  c_grocery uuid; c_books uuid; c_clearance uuid;
BEGIN
  -- Top-level categories (23 from user's list)
  c_tools      := public._seed_category('Tools & Machinery', NULL, 1);
  c_electronics:= public._seed_category('Electronics', NULL, 2);
  c_phone      := public._seed_category('Phone Accessories', NULL, 3);
  c_computers  := public._seed_category('Computers & IT', NULL, 4);
  c_electrical := public._seed_category('Electrical', NULL, 5);
  c_solar      := public._seed_category('Solar', NULL, 6);
  c_plumbing   := public._seed_category('Plumbing & Irrigation', NULL, 7);
  c_locks      := public._seed_category('Locks & Security', NULL, 8);
  c_appliances := public._seed_category('Home Appliances', NULL, 9);
  c_kitchen    := public._seed_category('Kitchen', NULL, 10);
  c_furniture  := public._seed_category('Furniture', NULL, 11);
  c_auto       := public._seed_category('Automotive', NULL, 12);
  c_office     := public._seed_category('Office Supplies', NULL, 13);
  c_lab        := public._seed_category('Lab & Medical Supplies', NULL, 14);
  c_health     := public._seed_category('Health & Beauty', NULL, 15);
  c_home       := public._seed_category('Home & Living', NULL, 16);
  c_sports     := public._seed_category('Sports & Outdoors', NULL, 17);
  c_baby       := public._seed_category('Baby & Kids', NULL, 18);
  c_pet        := public._seed_category('Pet Supplies', NULL, 19);
  c_fashion    := public._seed_category('Fashion', NULL, 20);
  c_grocery    := public._seed_category('Grocery', NULL, 21);
  c_books      := public._seed_category('Books & Stationery', NULL, 22);
  c_clearance  := public._seed_category('Clearance', NULL, 23);

  -- Tools & Machinery subs
  PERFORM public._seed_category('Power Tools', c_tools, 1);
  PERFORM public._seed_category('Hand Tools', c_tools, 2);
  PERFORM public._seed_category('Measuring & Layout Tools', c_tools, 3);
  PERFORM public._seed_category('Cutting & Grinding', c_tools, 4);
  PERFORM public._seed_category('Air Compressors', c_tools, 5);
  PERFORM public._seed_category('Pressure Washers', c_tools, 6);
  PERFORM public._seed_category('Welding Equipment', c_tools, 7);
  PERFORM public._seed_category('Tool Storage', c_tools, 8);
  PERFORM public._seed_category('Tool Accessories', c_tools, 9);
  PERFORM public._seed_category('Tool Parts', c_tools, 10);
  PERFORM public._seed_category('Generators', c_tools, 11);
  PERFORM public._seed_category('Farm Equipment', c_tools, 12);
  PERFORM public._seed_category('Packaging Equipment', c_tools, 13);
  PERFORM public._seed_category('Workshop Equipment', c_tools, 14);
  PERFORM public._seed_category('Construction Equipment', c_tools, 15);

  -- Electronics
  PERFORM public._seed_category('Mobile Phones', c_electronics, 1);
  PERFORM public._seed_category('Tablets', c_electronics, 2);
  PERFORM public._seed_category('Smart Watches', c_electronics, 3);
  PERFORM public._seed_category('Computers', c_electronics, 4);
  PERFORM public._seed_category('Computer Accessories', c_electronics, 5);
  PERFORM public._seed_category('Networking', c_electronics, 6);
  PERFORM public._seed_category('TV & Entertainment', c_electronics, 7);
  PERFORM public._seed_category('Audio', c_electronics, 8);
  PERFORM public._seed_category('Cameras', c_electronics, 9);
  PERFORM public._seed_category('CCTV & Security', c_electronics, 10);
  PERFORM public._seed_category('Gaming', c_electronics, 11);
  PERFORM public._seed_category('Drones', c_electronics, 12);
  PERFORM public._seed_category('Smart Home', c_electronics, 13);
  PERFORM public._seed_category('Projectors', c_electronics, 14);
  PERFORM public._seed_category('Wearable Technology', c_electronics, 15);

  -- Phone Accessories
  PERFORM public._seed_category('Chargers', c_phone, 1);
  PERFORM public._seed_category('Charging Cables', c_phone, 2);
  PERFORM public._seed_category('Power Banks', c_phone, 3);
  PERFORM public._seed_category('Cases', c_phone, 4);
  PERFORM public._seed_category('Screen Protectors', c_phone, 5);
  PERFORM public._seed_category('Earbuds', c_phone, 6);
  PERFORM public._seed_category('Phone Holders', c_phone, 7);
  PERFORM public._seed_category('Car Chargers', c_phone, 8);
  PERFORM public._seed_category('Wireless Chargers', c_phone, 9);
  PERFORM public._seed_category('Memory Cards', c_phone, 10);
  PERFORM public._seed_category('Flash Drives', c_phone, 11);
  PERFORM public._seed_category('Ring Lights', c_phone, 12);
  PERFORM public._seed_category('Selfie Sticks', c_phone, 13);
  PERFORM public._seed_category('OTG Adapters', c_phone, 14);

  -- Computers & IT
  PERFORM public._seed_category('Laptops', c_computers, 1);
  PERFORM public._seed_category('Desktops', c_computers, 2);
  PERFORM public._seed_category('Monitors', c_computers, 3);
  PERFORM public._seed_category('Printers', c_computers, 4);
  PERFORM public._seed_category('Scanners', c_computers, 5);
  PERFORM public._seed_category('UPS', c_computers, 6);
  PERFORM public._seed_category('Keyboards', c_computers, 7);
  PERFORM public._seed_category('Mouse', c_computers, 8);
  PERFORM public._seed_category('Laptop Bags', c_computers, 9);
  PERFORM public._seed_category('SSD', c_computers, 10);
  PERFORM public._seed_category('HDD', c_computers, 11);
  PERFORM public._seed_category('RAM', c_computers, 12);
  PERFORM public._seed_category('Routers', c_computers, 13);
  PERFORM public._seed_category('Switches', c_computers, 14);
  PERFORM public._seed_category('WiFi Extenders', c_computers, 15);
  PERFORM public._seed_category('Access Points', c_computers, 16);
  PERFORM public._seed_category('NAS Storage', c_computers, 17);
  PERFORM public._seed_category('Servers', c_computers, 18);

  -- Electrical
  PERFORM public._seed_category('Lighting', c_electrical, 1);
  PERFORM public._seed_category('Extension Cables', c_electrical, 2);
  PERFORM public._seed_category('Cable Reels', c_electrical, 3);
  PERFORM public._seed_category('Electrical Cables', c_electrical, 4);
  PERFORM public._seed_category('Electrical Switches', c_electrical, 5);
  PERFORM public._seed_category('Sockets', c_electrical, 6);
  PERFORM public._seed_category('Circuit Breakers', c_electrical, 7);
  PERFORM public._seed_category('Distribution Boards', c_electrical, 8);
  PERFORM public._seed_category('Electrical Testers', c_electrical, 9);
  PERFORM public._seed_category('Electrical Installation Materials', c_electrical, 10);

  -- Solar
  PERFORM public._seed_category('Solar Panels', c_solar, 1);
  PERFORM public._seed_category('Solar Batteries', c_solar, 2);
  PERFORM public._seed_category('Inverters', c_solar, 3);
  PERFORM public._seed_category('Charge Controllers', c_solar, 4);
  PERFORM public._seed_category('Solar Lights', c_solar, 5);
  PERFORM public._seed_category('Solar CCTV', c_solar, 6);
  PERFORM public._seed_category('Solar Pumps', c_solar, 7);
  PERFORM public._seed_category('Complete Solar Kits', c_solar, 8);
  PERFORM public._seed_category('Solar Accessories', c_solar, 9);
  PERFORM public._seed_category('Mounting Kits', c_solar, 10);

  -- Plumbing & Irrigation
  PERFORM public._seed_category('Pipes', c_plumbing, 1);
  PERFORM public._seed_category('Plumbing Fittings', c_plumbing, 2);
  PERFORM public._seed_category('Shower Heads', c_plumbing, 3);
  PERFORM public._seed_category('Water Taps', c_plumbing, 4);
  PERFORM public._seed_category('Valves', c_plumbing, 5);
  PERFORM public._seed_category('Water Pumps', c_plumbing, 6);
  PERFORM public._seed_category('Irrigation Systems', c_plumbing, 7);
  PERFORM public._seed_category('Water Tanks', c_plumbing, 8);
  PERFORM public._seed_category('Plumbing Supplies', c_plumbing, 9);
  PERFORM public._seed_category('Plumbing Tools', c_plumbing, 10);

  -- Locks & Security
  PERFORM public._seed_category('Door Locks', c_locks, 1);
  PERFORM public._seed_category('Padlocks', c_locks, 2);
  PERFORM public._seed_category('Smart Locks', c_locks, 3);
  PERFORM public._seed_category('Door Closers', c_locks, 4);
  PERFORM public._seed_category('Safes', c_locks, 5);
  PERFORM public._seed_category('CCTV', c_locks, 6);
  PERFORM public._seed_category('Alarm Systems', c_locks, 7);
  PERFORM public._seed_category('Electric Fence', c_locks, 8);
  PERFORM public._seed_category('Access Control', c_locks, 9);
  PERFORM public._seed_category('Gate Automation', c_locks, 10);

  -- Home Appliances
  PERFORM public._seed_category('Refrigerators', c_appliances, 1);
  PERFORM public._seed_category('Freezers', c_appliances, 2);
  PERFORM public._seed_category('Washing Machines', c_appliances, 3);
  PERFORM public._seed_category('Dryers', c_appliances, 4);
  PERFORM public._seed_category('Cookers', c_appliances, 5);
  PERFORM public._seed_category('Ovens', c_appliances, 6);
  PERFORM public._seed_category('Microwaves', c_appliances, 7);
  PERFORM public._seed_category('Dishwashers', c_appliances, 8);
  PERFORM public._seed_category('Air Conditioners', c_appliances, 9);
  PERFORM public._seed_category('Water Dispensers', c_appliances, 10);
  PERFORM public._seed_category('Water Purifiers', c_appliances, 11);
  PERFORM public._seed_category('Vacuum Cleaners', c_appliances, 12);

  -- Kitchen
  PERFORM public._seed_category('Blenders', c_kitchen, 1);
  PERFORM public._seed_category('Mixers', c_kitchen, 2);
  PERFORM public._seed_category('Air Fryers', c_kitchen, 3);
  PERFORM public._seed_category('Pressure Cookers', c_kitchen, 4);
  PERFORM public._seed_category('Rice Cookers', c_kitchen, 5);
  PERFORM public._seed_category('Coffee Machines', c_kitchen, 6);
  PERFORM public._seed_category('Juicers', c_kitchen, 7);
  PERFORM public._seed_category('Electric Kettles', c_kitchen, 8);
  PERFORM public._seed_category('Toasters', c_kitchen, 9);
  PERFORM public._seed_category('Kitchenware', c_kitchen, 10);

  -- Furniture
  PERFORM public._seed_category('Office Chairs', c_furniture, 1);
  PERFORM public._seed_category('Office Desks', c_furniture, 2);
  PERFORM public._seed_category('Gaming Chairs', c_furniture, 3);
  PERFORM public._seed_category('Cabinets', c_furniture, 4);
  PERFORM public._seed_category('Shelving', c_furniture, 5);
  PERFORM public._seed_category('Storage Solutions', c_furniture, 6);

  -- Automotive
  PERFORM public._seed_category('Car Audio', c_auto, 1);
  PERFORM public._seed_category('Dash Cameras', c_auto, 2);
  PERFORM public._seed_category('Car Phone Chargers', c_auto, 3);
  PERFORM public._seed_category('Car Accessories', c_auto, 4);
  PERFORM public._seed_category('Car Care', c_auto, 5);
  PERFORM public._seed_category('Jump Starters', c_auto, 6);
  PERFORM public._seed_category('Vehicle Tools', c_auto, 7);
  PERFORM public._seed_category('GPS', c_auto, 8);

  -- Office Supplies
  PERFORM public._seed_category('Stationery', c_office, 1);
  PERFORM public._seed_category('Paper', c_office, 2);
  PERFORM public._seed_category('Laminators', c_office, 3);
  PERFORM public._seed_category('Binding Machines', c_office, 4);
  PERFORM public._seed_category('Whiteboards', c_office, 5);
  PERFORM public._seed_category('Calculators', c_office, 6);
  PERFORM public._seed_category('Paper Shredders', c_office, 7);
  PERFORM public._seed_category('Office Equipment', c_office, 8);

  -- Lab & Medical
  PERFORM public._seed_category('Medical Equipment', c_lab, 1);
  PERFORM public._seed_category('Laboratory Equipment', c_lab, 2);
  PERFORM public._seed_category('Diagnostic Equipment', c_lab, 3);
  PERFORM public._seed_category('PPE', c_lab, 4);
  PERFORM public._seed_category('Hospital Furniture', c_lab, 5);

  -- Health & Beauty
  PERFORM public._seed_category('Hair Clippers', c_health, 1);
  PERFORM public._seed_category('Shavers', c_health, 2);
  PERFORM public._seed_category('Blow Dryers', c_health, 3);
  PERFORM public._seed_category('Massage Guns', c_health, 4);
  PERFORM public._seed_category('Personal Care', c_health, 5);
  PERFORM public._seed_category('Wellness', c_health, 6);
  PERFORM public._seed_category('Oral Care', c_health, 7);

  -- Home & Living
  PERFORM public._seed_category('Home Décor', c_home, 1);
  PERFORM public._seed_category('Cleaning Supplies', c_home, 2);
  PERFORM public._seed_category('Home Lighting', c_home, 3);
  PERFORM public._seed_category('Fans', c_home, 4);
  PERFORM public._seed_category('Heaters', c_home, 5);
  PERFORM public._seed_category('Mosquito Killers', c_home, 6);
  PERFORM public._seed_category('Travel & Luggage', c_home, 7);
  PERFORM public._seed_category('Kids & Toys', c_home, 8);

  -- Sports & Outdoors
  PERFORM public._seed_category('Gym Equipment', c_sports, 1);
  PERFORM public._seed_category('Camping', c_sports, 2);
  PERFORM public._seed_category('Cycling', c_sports, 3);
  PERFORM public._seed_category('Outdoor Furniture', c_sports, 4);
  PERFORM public._seed_category('Fitness Accessories', c_sports, 5);

  -- Baby & Kids
  PERFORM public._seed_category('Baby Care', c_baby, 1);
  PERFORM public._seed_category('Feeding', c_baby, 2);
  PERFORM public._seed_category('Toys', c_baby, 3);
  PERFORM public._seed_category('School Supplies', c_baby, 4);

  -- Pet Supplies
  PERFORM public._seed_category('Pet Food', c_pet, 1);
  PERFORM public._seed_category('Pet Accessories', c_pet, 2);
  PERFORM public._seed_category('Grooming', c_pet, 3);
  PERFORM public._seed_category('Aquariums', c_pet, 4);

  -- Fashion
  PERFORM public._seed_category('Men''s Fashion', c_fashion, 1);
  PERFORM public._seed_category('Women''s Fashion', c_fashion, 2);
  PERFORM public._seed_category('Watches', c_fashion, 3);
  PERFORM public._seed_category('Shoes', c_fashion, 4);
  PERFORM public._seed_category('Bags', c_fashion, 5);

  -- Grocery
  PERFORM public._seed_category('Beverages', c_grocery, 1);
  PERFORM public._seed_category('Snacks', c_grocery, 2);
  PERFORM public._seed_category('Household Consumables', c_grocery, 3);

  -- Clearance
  PERFORM public._seed_category('Clearance Deals', c_clearance, 1);
  PERFORM public._seed_category('Refurbished', c_clearance, 2);
  PERFORM public._seed_category('Open Box', c_clearance, 3);
  PERFORM public._seed_category('Overstock', c_clearance, 4);
END $$;

DROP FUNCTION public._seed_category(text, uuid, int);

-- =========================================================================
-- 5. Seed brands
-- =========================================================================
INSERT INTO public.brands (name, slug, is_featured, display_order) VALUES
  ('Bosch',    'bosch',    true, 1),
  ('Ingco',    'ingco',    true, 2),
  ('Total',    'total',    true, 3),
  ('Makita',   'makita',   true, 4),
  ('DeWalt',   'dewalt',   true, 5),
  ('Tolsen',   'tolsen',   true, 6),
  ('Stanley',  'stanley',  true, 7),
  ('Hyundai',  'hyundai',  false, 8),
  ('Honda',    'honda',    false, 9),
  ('Samsung',  'samsung',  true, 10),
  ('Apple',    'apple',    true, 11),
  ('TCL',      'tcl',      false, 12),
  ('LG',       'lg',       true, 13),
  ('Sony',     'sony',     true, 14),
  ('JBL',      'jbl',      false, 15),
  ('Xiaomi',   'xiaomi',   false, 16),
  ('HP',       'hp',       true, 17),
  ('Dell',     'dell',     true, 18),
  ('Lenovo',   'lenovo',   false, 19),
  ('Epson',    'epson',    false, 20),
  ('Canon',    'canon',    false, 21),
  ('Hikvision','hikvision',false, 22),
  ('Dahua',    'dahua',    false, 23)
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- 6. Auto-detect brand on existing products from product name
-- =========================================================================
UPDATE public.products p
SET brand = b.name
FROM public.brands b
WHERE (p.brand IS NULL OR btrim(p.brand) = '')
  AND p.name ~* ('\y' || b.name || '\y');
