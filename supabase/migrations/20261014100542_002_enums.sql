/*
# Create Custom Enum Types

1. New Types
- `payment_method` — mpesa, bank, cash, card, cheque
- `document_type` — quotation, invoice, receipt, purchase_order, bill, credit_note, debit_note
- `invoice_status` — draft, sent, paid, partially_paid, overdue, cancelled
- `order_status` — pending, confirmed, processing, delivered, cancelled, on_hold
- `user_role` — owner, admin, manager, staff, viewer
- `tax_category` — standard_rated, zero_rated, exempt, export
- `stock_movement_type` — purchase, sale, adjustment, transfer_in, transfer_out, return, initial
2. Security
- No security changes (types only)
3. Notes
- Safe to run multiple times (DO block guards each CREATE)
- These enums are used by core tables in migration 003
*/

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('mpesa', 'bank', 'cash', 'card', 'cheque');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM ('quotation', 'invoice', 'receipt', 'purchase_order', 'bill', 'credit_note', 'debit_note');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'processing', 'delivered', 'cancelled', 'on_hold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('owner', 'admin', 'manager', 'staff', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tax_category AS ENUM ('standard_rated', 'zero_rated', 'exempt', 'export');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE stock_movement_type AS ENUM ('purchase', 'sale', 'adjustment', 'transfer_in', 'transfer_out', 'return', 'initial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
