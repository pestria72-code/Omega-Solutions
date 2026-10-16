-- 032_inventory_weighted_average_cost.sql
-- Persist weighted-average inventory cost separately from the mutable product master cost.
ALTER TABLE inventory_stock_levels
  ADD COLUMN IF NOT EXISTS average_unit_cost NUMERIC(16,4) NOT NULL DEFAULT 0
  CHECK (average_unit_cost >= 0);

-- Seed historical balances from positive-cost inbound movements. This is an initial
-- estimate for existing stock, not a claim to reconstruct every historical issue.
WITH inbound AS (
  SELECT company_id, warehouse_id, product_id,
         SUM(quantity) AS inbound_quantity,
         SUM(quantity * unit_cost) AS inbound_value
  FROM inventory_stock_movements
  WHERE movement_type IN ('receipt','opening_balance','transfer_in')
    AND quantity > 0
  GROUP BY company_id, warehouse_id, product_id
)
UPDATE inventory_stock_levels s
SET average_unit_cost = ROUND((i.inbound_value / NULLIF(i.inbound_quantity, 0))::numeric, 4)
FROM inbound i
WHERE i.company_id = s.company_id
  AND i.warehouse_id = s.warehouse_id
  AND i.product_id = s.product_id
  AND s.average_unit_cost = 0
  AND i.inbound_quantity > 0;

CREATE INDEX IF NOT EXISTS idx_inventory_stock_company_cost
  ON inventory_stock_levels(company_id, product_id, average_unit_cost);
