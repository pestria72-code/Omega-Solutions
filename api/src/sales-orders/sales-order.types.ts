export type SalesOrderStatus = 'confirmed' | 'processing' | 'fulfilled' | 'cancelled';
export interface SalesOrderItemRow {
  [key: string]: unknown;
  id: string;
  sales_order_id: string;
  product_id: string | null;
  product_name: string;
  sku: string | null;
  quantity: string | number;
  unit_price: string | number;
  tax_rate: string | number;
  line_subtotal: string | number;
  tax_amount: string | number;
  line_total: string | number;
}
export interface SalesOrderRow {
  [key: string]: unknown;
  id: string;
  company_id: string;
  customer_id: string;
  customer_name: string;
  source_quotation_id: string | null;
  source_quotation_number?: string | null;
  order_number: string;
  order_date: string;
  status: SalesOrderStatus;
  currency: string;
  subtotal: string | number;
  tax_amount: string | number;
  total: string | number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  item_count?: number;
  items?: SalesOrderItemRow[];
}
