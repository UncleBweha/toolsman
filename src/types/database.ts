// Custom types for the database tables (used before types.ts is auto-generated)

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  original_price: number | null;
  sku: string | null;
  stock_quantity: number;
  category_id: string | null;
  image_url: string | null;
  images: string[];
  brand?: string | null;
  tags?: string[];
  generated_tags?: string[];   // auto-extracted NLP tags
  key_features?: string[];
  status?: string | null;
  is_featured: boolean;
  is_active: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface Order {
  id: string;
  user_id: string | null;
  order_number: string;
  status: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  shipping_address: unknown;
  billing_address: unknown;
  notes: string | null;
  // VAT / eTIMS fields
  vat_enabled?: boolean;
  vat_amount?: number;
  kra_pin?: string | null;
  tax_name?: string | null;
  etims_invoice_number?: string | null;
  receipt_status?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface Wishlist {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface ImportHistory {
  id: string;
  admin_id: string | null;
  filename: string;
  total_rows: number;
  success_count: number;
  error_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errors: Array<{ row: number; message: string }>;
  imported_product_ids: string[];
  created_at: string;
  completed_at: string | null;
}

export type AppRole = 'admin' | 'moderator' | 'user';
