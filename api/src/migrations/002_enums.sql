-- 002_enums.sql
-- Custom enum types used across Omega ERP tables.
-- These are the foundational enumerations for the system.
-- Safe to run multiple times (DO block guards each CREATE).

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
