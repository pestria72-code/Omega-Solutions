-- 018_manufacturing_execution.sql
-- Reservation state for atomic production execution and stock ledger posting.
ALTER TABLE manufacturing_order_materials
 ADD COLUMN IF NOT EXISTS reserved_quantity NUMERIC(16,4) NOT NULL DEFAULT 0 CHECK(reserved_quantity>=0);
ALTER TABLE manufacturing_order_materials
 ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ;
ALTER TABLE manufacturing_production_orders
 ADD COLUMN IF NOT EXISTS material_reserved_at TIMESTAMPTZ;
ALTER TABLE manufacturing_production_orders
 ADD COLUMN IF NOT EXISTS materials_consumed_at TIMESTAMPTZ;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='manufacturing_order_material_reserved_lte_required') THEN
  ALTER TABLE manufacturing_order_materials ADD CONSTRAINT manufacturing_order_material_reserved_lte_required CHECK(reserved_quantity<=required_quantity);
 END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_manufacturing_order_materials_company_product ON manufacturing_order_materials(company_id,material_product_id);
