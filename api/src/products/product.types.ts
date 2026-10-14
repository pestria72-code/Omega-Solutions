export interface ProductRow {
  id: string;
  company_id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  selling_price: string | number;
  cost_price: string | number;
  stock_quantity: string | number;
  reorder_level: string | number;
  is_service: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}
