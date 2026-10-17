-- 033_requisitions_approvals.sql
-- Company-scoped requisitions and reusable approval requests. No stock/accounting postings occur here.
CREATE TABLE IF NOT EXISTS requisitions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 branch_id uuid NULL REFERENCES branches(id) ON DELETE SET NULL,
 request_number text NOT NULL,
 requester_user_id uuid NOT NULL REFERENCES users(id),
 title text NOT NULL,
 notes text NULL,
 required_by date NULL,
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','rejected','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(company_id, request_number)
);
CREATE TABLE IF NOT EXISTS requisition_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 requisition_id uuid NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
 product_id uuid NOT NULL REFERENCES products(id),
 quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
 notes text NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS approval_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 branch_id uuid NULL REFERENCES branches(id) ON DELETE SET NULL,
 entity_type text NOT NULL,
 entity_id uuid NOT NULL,
 requester_user_id uuid NOT NULL REFERENCES users(id),
 approver_user_id uuid NULL REFERENCES users(id),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
 decision_note text NULL,
 requested_at timestamptz NOT NULL DEFAULT now(),
 decided_at timestamptz NULL,
 UNIQUE(company_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_requisitions_company_status_created ON requisitions(company_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requisition_items_company_parent ON requisition_items(company_id,requisition_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_inbox ON approval_requests(company_id,status,requested_at DESC);
INSERT INTO permissions(permission,description,category) VALUES
 ('requisitions:read','View purchase requisitions','requisitions'),
 ('requisitions:write','Create and submit purchase requisitions','requisitions'),
 ('approvals:read','View approval inbox','approvals'),
 ('approvals:approve','Approve or reject eligible requests','approvals')
ON CONFLICT(permission) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'owner',id FROM permissions WHERE permission IN ('requisitions:read','requisitions:write','approvals:read','approvals:approve')
ON CONFLICT(role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'admin',id FROM permissions WHERE permission IN ('requisitions:read','requisitions:write','approvals:read','approvals:approve')
ON CONFLICT(role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'manager',id FROM permissions WHERE permission IN ('requisitions:read','requisitions:write','approvals:read','approvals:approve')
ON CONFLICT(role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'staff',id FROM permissions WHERE permission IN ('requisitions:read','requisitions:write')
ON CONFLICT(role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'viewer',id FROM permissions WHERE permission IN ('requisitions:read','approvals:read')
ON CONFLICT(role,permission_id) DO NOTHING;
