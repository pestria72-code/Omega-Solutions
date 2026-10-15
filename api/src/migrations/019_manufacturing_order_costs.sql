-- 019_manufacturing_order_costs.sql
-- Traceable labour and overhead costs, capitalised into WIP and transferred to finished inventory.
CREATE TABLE IF NOT EXISTS manufacturing_order_costs (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 production_order_id UUID NOT NULL,
 cost_type VARCHAR(16) NOT NULL CHECK(cost_type IN ('labour','overhead')),
 description VARCHAR(240) NOT NULL,
 amount NUMERIC(16,2) NOT NULL CHECK(amount>0),
 source_account_id UUID NOT NULL,
 incurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
 journal_entry_id UUID,
 created_by UUID REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT manufacturing_order_cost_order_company_fk FOREIGN KEY(production_order_id,company_id) REFERENCES manufacturing_production_orders(id,company_id) ON DELETE CASCADE,
 CONSTRAINT manufacturing_order_cost_account_company_fk FOREIGN KEY(source_account_id,company_id) REFERENCES chart_of_accounts(id,company_id) ON DELETE RESTRICT,
 CONSTRAINT manufacturing_order_cost_journal_company_fk FOREIGN KEY(journal_entry_id,company_id) REFERENCES journal_entries(id,company_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_manufacturing_order_costs_company_order ON manufacturing_order_costs(company_id,production_order_id,incurred_on);
ALTER TABLE manufacturing_order_costs ENABLE ROW LEVEL SECURITY;
