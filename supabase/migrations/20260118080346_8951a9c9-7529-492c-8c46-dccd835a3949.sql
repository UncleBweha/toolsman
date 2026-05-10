-- Insert main categories and subcategories
INSERT INTO categories (id, name, slug, description, display_order, is_active, parent_id) VALUES
-- 1. Tools & Machinery
('11111111-0001-0001-0001-000000000001', 'Tools & Machinery', 'tools-machinery', 'Power tools, hand tools, farm equipment, packaging and safety wear', 1, true, NULL),
('11111111-0001-0001-0001-000000000002', 'Power & Hand Tools', 'power-hand-tools', 'Electric and manual tools for construction and DIY', 1, true, '11111111-0001-0001-0001-000000000001'),
('11111111-0001-0001-0001-000000000003', 'Farm Equipment', 'farm-equipment', 'Agricultural machinery and tools', 2, true, '11111111-0001-0001-0001-000000000001'),
('11111111-0001-0001-0001-000000000004', 'Packaging', 'packaging', 'Packaging materials and equipment', 3, true, '11111111-0001-0001-0001-000000000001'),
('11111111-0001-0001-0001-000000000005', 'Safety Ware (PPE)', 'safety-ware-ppe', 'Personal protective equipment', 4, true, '11111111-0001-0001-0001-000000000001'),

-- 2. Locks & Hardware
('11111111-0002-0001-0001-000000000001', 'Locks & Hardware', 'locks-hardware', 'Door locks, fittings and security systems', 2, true, NULL),
('11111111-0002-0001-0001-000000000002', 'Door Locks', 'door-locks', 'Various types of door locks', 1, true, '11111111-0002-0001-0001-000000000001'),
('11111111-0002-0001-0001-000000000003', 'Fittings', 'fittings', 'Hardware fittings and accessories', 2, true, '11111111-0002-0001-0001-000000000001'),
('11111111-0002-0001-0001-000000000004', 'Security & Surveillance (CCTV)', 'security-surveillance-cctv', 'CCTV cameras and security systems', 3, true, '11111111-0002-0001-0001-000000000001'),

-- 3. Plumbing & Irrigation
('11111111-0003-0001-0001-000000000001', 'Plumbing & Irrigation', 'plumbing-irrigation', 'Plumbing supplies, irrigation systems and water pumps', 3, true, NULL),
('11111111-0003-0001-0001-000000000002', 'Plumbing Supplies', 'plumbing-supplies', 'Pipes, faucets, and plumbing accessories', 1, true, '11111111-0003-0001-0001-000000000001'),
('11111111-0003-0001-0001-000000000003', 'Irrigation Systems', 'irrigation-systems', 'Drip and sprinkler irrigation equipment', 2, true, '11111111-0003-0001-0001-000000000001'),
('11111111-0003-0001-0001-000000000004', 'Water Pumps', 'water-pumps', 'Electric and manual water pumps', 3, true, '11111111-0003-0001-0001-000000000001'),

-- 4. Electronics, Electricals & IT
('11111111-0004-0001-0001-000000000001', 'Electronics, Electricals & IT', 'electronics-electricals-it', 'Sound systems, car audio, electronics and computer accessories', 4, true, NULL),
('11111111-0004-0001-0001-000000000002', 'Sound / PA Systems', 'sound-pa-systems', 'Professional audio and PA equipment', 1, true, '11111111-0004-0001-0001-000000000001'),
('11111111-0004-0001-0001-000000000003', 'Car Audio', 'car-audio', 'Car speakers, amplifiers and subwoofers', 2, true, '11111111-0004-0001-0001-000000000001'),
('11111111-0004-0001-0001-000000000004', 'Radio & TVs', 'radio-tvs', 'Televisions and radio equipment', 3, true, '11111111-0004-0001-0001-000000000001'),
('11111111-0004-0001-0001-000000000005', 'Computer & Mobile Accessories', 'computer-mobile-accessories', 'Phone cases, chargers, computer peripherals', 4, true, '11111111-0004-0001-0001-000000000001'),
('11111111-0004-0001-0001-000000000006', 'Electrical Supplies', 'electrical-supplies', 'Wires, switches, and electrical components', 5, true, '11111111-0004-0001-0001-000000000001'),

-- 5. Solar Energy & Cold Solutions
('11111111-0005-0001-0001-000000000001', 'Solar Energy & Cold Solutions', 'solar-energy-cold-solutions', 'Solar panels, batteries, inverters and cold solutions', 5, true, NULL),
('11111111-0005-0001-0001-000000000002', 'Solar Lights', 'solar-lights', 'Solar powered lighting solutions', 1, true, '11111111-0005-0001-0001-000000000001'),
('11111111-0005-0001-0001-000000000003', 'Solar Panels', 'solar-panels', 'Photovoltaic solar panels', 2, true, '11111111-0005-0001-0001-000000000001'),
('11111111-0005-0001-0001-000000000004', 'Inverters & Charge Controllers', 'inverters-charge-controllers', 'Solar inverters and charge controllers', 3, true, '11111111-0005-0001-0001-000000000001'),
('11111111-0005-0001-0001-000000000005', 'Batteries', 'batteries', 'Solar and deep cycle batteries', 4, true, '11111111-0005-0001-0001-000000000001'),
('11111111-0005-0001-0001-000000000006', 'Complete Kits', 'complete-kits', 'Ready-to-install solar kits', 5, true, '11111111-0005-0001-0001-000000000001'),
('11111111-0005-0001-0001-000000000007', 'Cold Solutions', 'cold-solutions', 'Refrigeration and cooling equipment', 6, true, '11111111-0005-0001-0001-000000000001'),

-- 6. Home & Living
('11111111-0006-0001-0001-000000000001', 'Home & Living', 'home-living', 'Home appliances and wellness products', 6, true, NULL),
('11111111-0006-0001-0001-000000000002', 'Home Appliances', 'home-appliances', 'Kitchen and household appliances', 1, true, '11111111-0006-0001-0001-000000000001'),
('11111111-0006-0001-0001-000000000003', 'Wellness & Beauty', 'wellness-beauty', 'Personal care and beauty products', 2, true, '11111111-0006-0001-0001-000000000001'),

-- 7. Lab & Medical Supplies
('11111111-0007-0001-0001-000000000001', 'Lab & Medical Supplies', 'lab-medical-supplies', 'Medical equipment and laboratory supplies', 7, true, NULL),
('11111111-0007-0001-0001-000000000002', 'Medical Equipment', 'medical-equipment', 'Healthcare and medical devices', 1, true, '11111111-0007-0001-0001-000000000001'),
('11111111-0007-0001-0001-000000000003', 'Laboratory Supplies', 'laboratory-supplies', 'Lab equipment and consumables', 2, true, '11111111-0007-0001-0001-000000000001'),

-- 8. Technical Services
('11111111-0008-0001-0001-000000000001', 'Technical Services', 'technical-services', 'Professional installation and repair services', 8, true, NULL),
('11111111-0008-0001-0001-000000000002', 'Plumbing & Irrigation Setup', 'plumbing-irrigation-setup', 'Professional plumbing installation', 1, true, '11111111-0008-0001-0001-000000000001'),
('11111111-0008-0001-0001-000000000003', 'Electrical Installation & Repair', 'electrical-installation-repair', 'Electrical wiring and repairs', 2, true, '11111111-0008-0001-0001-000000000001'),
('11111111-0008-0001-0001-000000000004', 'Security & CCTV Installation', 'security-cctv-installation', 'CCTV and security system setup', 3, true, '11111111-0008-0001-0001-000000000001'),
('11111111-0008-0001-0001-000000000005', 'IT & Network Installation', 'it-network-installation', 'Network and IT infrastructure setup', 4, true, '11111111-0008-0001-0001-000000000001'),
('11111111-0008-0001-0001-000000000006', 'Mechanic & Machinery Repair', 'mechanic-machinery-repair', 'Machine and vehicle repairs', 5, true, '11111111-0008-0001-0001-000000000001'),
('11111111-0008-0001-0001-000000000007', 'Construction & Carpentry', 'construction-carpentry', 'Building and woodwork services', 6, true, '11111111-0008-0001-0001-000000000001'),
('11111111-0008-0001-0001-000000000008', 'Interior Design & Landscaping', 'interior-design-landscaping', 'Home design and outdoor landscaping', 7, true, '11111111-0008-0001-0001-000000000001'),
('11111111-0008-0001-0001-000000000009', 'Printing & Branding Services', 'printing-branding-services', 'Custom printing and branding solutions', 8, true, '11111111-0008-0001-0001-000000000001');