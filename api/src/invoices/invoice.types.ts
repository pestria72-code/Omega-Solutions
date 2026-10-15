export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'paid'
  | 'partially_paid'
  | 'overdue'
  | 'cancelled';

export interface InvoiceItemRow {
  [key: string]: unknown;
  id: string;
  invoice_id: string;
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

export interface InvoiceRow {
  [key: string]: unknown;
  id: string;
  company_id: string;
  customer_id: string;
  customer_name: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  currency: string;
  subtotal: string | number;
  tax_amount: string | number;
  total: string | number;
  amount_paid: string | number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  item_count?: number;
  items?: InvoiceItemRow[];
  payments?: InvoicePaymentRow[];
}

export interface InvoicePaymentRow {
  [key: string]: unknown;
  id: string;
  invoice_id: string;
  amount: string | number;
  method: 'mpesa' | 'bank' | 'cash' | 'card' | 'cheque';
  reference: string | null;
  paid_at: string;
  notes: string | null;
  created_at: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'reconciled';
  verified_at: string | null;
  reconciled_at: string | null;
}
