-- Keep product image fields aligned with ProductsService. Safe to re-run on
-- development databases that already have one or both columns.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS image_storage_key TEXT;
