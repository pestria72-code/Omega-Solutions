-- 013_inventory_warehousing.sql
-- Company-scoped warehouses, stock ledger and per-warehouse quantities.
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  code VARCHAR(24) NOT NULL,
  name VARCHAR(160) NOT NULL,
  location VARCHAR(500),
  capacity NUMERIC(16,3) NOT NULL DEFAULT 0 CHECK (capacity >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, code),
  UNIQUE(id, company_id)
);
CREATE INDEX IF NOT EXISTS idx_warehouses_company_active ON warehouses(company_id, is_active, name);

CREATE TABLE IF NOT EXISTS inventory_stock_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity NUMERIC(16,4) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved_quantity NUMERIC(16,4) NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  reorder_level NUMERIC(16,4) NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_stock_reserved_lte_quantity CHECK (reserved_quantity <= quantity),
  CONSTRAINT inventory_stock_warehouse_company_fk FOREIGN KEY (warehouse_id, company_id) REFERENCES warehouses(id, company_id) ON DELETE CASCADE,
  CONSTRAINT inventory_stock_product_company_fk FOREIGN KEY (product_id, company_id) REFERENCES products(id, company_id) ON DELETE CASCADE,
  UNIQUE(warehouse_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_company_product ON inventory_stock_levels(company_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_company_warehouse ON inventory_stock_levels(company_id, warehouse_id);

CREATE TABLE IF NOT EXISTS inventory_stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  warehouse_id UUID NOT NULL,
  movement_type VARCHAR(24) NOT NULL CHECK (movement_type IN ('receipt','issue','adjustment','transfer_in','transfer_out','opening_balance')),
  quantity NUMERIC(16,4) NOT NULL CHECK (quantity <> 0),
  unit_cost NUMERIC(16,4) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  reference VARCHAR(120),
  notes TEXT,
  transfer_group_id UUID,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_movement_warehouse_company_fk FOREIGN KEY (warehouse_id, company_id) REFERENCES warehouses(id, company_id) ON DELETE CASCADE,
  CONSTRAINT inventory_movement_product_company_fk FOREIGN KEY (product_id, company_id) REFERENCES products(id, company_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_company_date ON inventory_stock_movements(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_company_product ON inventory_stock_movements(company_id, product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_transfer_group ON inventory_stock_movements(transfer_group_id) WHERE transfer_group_id IS NOT NULL;

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock_movements ENABLE ROW LEVEL SECURITY;

-- Give every existing company a real default warehouse, preserving legacy product quantities as opening stock.
INSERT INTO warehouses(company_id, code, name, location)
SELECT c.id, 'MAIN', 'Main Warehouse', 'Default warehouse'
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM warehouses w WHERE w.company_id = c.id);

INSERT INTO inventory_stock_levels(company_id, warehouse_id, product_id, quantity, reorder_level)
SELECT p.company_id, w.id, p.id, p.stock_quantity, p.reorder_level
FROM products p
JOIN warehouses w ON w.company_id = p.company_id AND w.code = 'MAIN'
WHERE p.is_service = FALSE
ON CONFLICT (warehouse_id, product_id) DO NOTHING;

INSERT INTO inventory_stock_movements(company_id, product_id, warehouse_id, movement_type, quantity, unit_cost, reference, notes)
SELECT s.company_id, s.product_id, s.warehouse_id, 'opening_balance', s.quantity, p.cost_price, 'MIGRATION-013', 'Opening balance migrated from legacy product stock'
FROM inventory_stock_levels s
JOIN products p ON p.id = s.product_id AND p.company_id = s.company_id
WHERE s.quantity > 0
  AND NOT EXISTS (SELECT 1 FROM inventory_stock_movements m WHERE m.company_id=s.company_id AND m.product_id=s.product_id AND m.warehouse_id=s.warehouse_id AND m.reference='MIGRATION-013');
