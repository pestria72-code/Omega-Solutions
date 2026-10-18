ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_storage_key TEXT;

CREATE INDEX IF NOT EXISTS idx_products_company_image_storage_key
  ON products(company_id, image_storage_key)
  WHERE image_storage_key IS NOT NULL;
