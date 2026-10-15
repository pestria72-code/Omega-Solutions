-- 017_manufacturing_foundation.sql
-- Tenant-scoped bills of materials and production order planning.
CREATE TABLE IF NOT EXISTS manufacturing_boms (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 code VARCHAR(32) NOT NULL,
 name VARCHAR(180) NOT NULL,
 product_id UUID NOT NULL,
 output_quantity NUMERIC(16,4) NOT NULL DEFAULT 1 CHECK(output_quantity>0),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
 status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
 notes TEXT,
 created_by UUID REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(company_id,code),
 UNIQUE(id,company_id),
 FOREIGN KEY(product_id,company_id) REFERENCES products(id,company_id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS manufacturing_bom_lines (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 bom_id UUID NOT NULL,
 material_product_id UUID NOT NULL,
 quantity NUMERIC(16,4) NOT NULL CHECK(quantity>0),
 waste_percent NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK(waste_percent>=0 AND waste_percent<=100),
 notes TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT manufacturing_bom_line_bom_company_fk FOREIGN KEY(bom_id,company_id) REFERENCES manufacturing_boms(id,company_id) ON DELETE CASCADE,
 CONSTRAINT manufacturing_bom_line_material_company_fk FOREIGN KEY(material_product_id,company_id) REFERENCES products(id,company_id) ON DELETE RESTRICT,
 UNIQUE(bom_id,material_product_id)
);
CREATE TABLE IF NOT EXISTS manufacturing_production_orders (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 order_number VARCHAR(40) NOT NULL,
 bom_id UUID NOT NULL,
 warehouse_id UUID NOT NULL,
 planned_quantity NUMERIC(16,4) NOT NULL CHECK(planned_quantity>0),
 produced_quantity NUMERIC(16,4) NOT NULL DEFAULT 0 CHECK(produced_quantity>=0),
 status VARCHAR(20) NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','in_progress','completed','cancelled')),
 planned_start_date DATE,
 planned_end_date DATE,
 actual_start_at TIMESTAMPTZ,
 completed_at TIMESTAMPTZ,
 notes TEXT,
 created_by UUID REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(company_id,order_number),
 UNIQUE(id,company_id),
 FOREIGN KEY(bom_id,company_id) REFERENCES manufacturing_boms(id,company_id) ON DELETE RESTRICT,
 FOREIGN KEY(warehouse_id,company_id) REFERENCES warehouses(id,company_id) ON DELETE RESTRICT,
 CHECK(planned_end_date IS NULL OR planned_start_date IS NULL OR planned_end_date>=planned_start_date)
);
CREATE TABLE IF NOT EXISTS manufacturing_order_materials (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 production_order_id UUID NOT NULL,
 material_product_id UUID NOT NULL,
 required_quantity NUMERIC(16,4) NOT NULL CHECK(required_quantity>0),
 consumed_quantity NUMERIC(16,4) NOT NULL DEFAULT 0 CHECK(consumed_quantity>=0),
 unit_cost NUMERIC(16,4) NOT NULL DEFAULT 0 CHECK(unit_cost>=0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT manufacturing_order_material_order_company_fk FOREIGN KEY(production_order_id,company_id) REFERENCES manufacturing_production_orders(id,company_id) ON DELETE CASCADE,
 CONSTRAINT manufacturing_order_material_product_company_fk FOREIGN KEY(material_product_id,company_id) REFERENCES products(id,company_id) ON DELETE RESTRICT,
 UNIQUE(production_order_id,material_product_id),
 CHECK(consumed_quantity<=required_quantity)
);
CREATE TABLE IF NOT EXISTS manufacturing_order_sequences (
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 entry_year INTEGER NOT NULL CHECK(entry_year BETWEEN 2000 AND 9999),
 next_number INTEGER NOT NULL DEFAULT 1 CHECK(next_number>0),
 PRIMARY KEY(company_id,entry_year)
);
CREATE INDEX IF NOT EXISTS idx_manufacturing_boms_company_status ON manufacturing_boms(company_id,status,name);
CREATE INDEX IF NOT EXISTS idx_manufacturing_bom_lines_company_bom ON manufacturing_bom_lines(company_id,bom_id);
CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_company_status ON manufacturing_production_orders(company_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manufacturing_order_materials_company_order ON manufacturing_order_materials(company_id,production_order_id);
ALTER TABLE manufacturing_boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_bom_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_order_materials ENABLE ROW LEVEL SECURITY;
INSERT INTO permissions(permission,description,category) VALUES
 ('manufacturing:read','View bills of materials and production orders','manufacturing'),
 ('manufacturing:write','Manage bills of materials and production orders','manufacturing')
ON CONFLICT(permission) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'owner',id FROM permissions WHERE permission IN ('manufacturing:read','manufacturing:write')
ON CONFLICT(role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'admin',id FROM permissions WHERE permission IN ('manufacturing:read','manufacturing:write')
ON CONFLICT(role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'manager',id FROM permissions WHERE permission IN ('manufacturing:read','manufacturing:write')
ON CONFLICT(role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'viewer',id FROM permissions WHERE permission='manufacturing:read'
ON CONFLICT(role,permission_id) DO NOTHING;
