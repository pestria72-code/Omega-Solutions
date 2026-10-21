-- Salesperson role: POS-only selling and read-only customer/product lookup.
-- Stock issuance remains a manager/storekeeper action; no payroll, finance,
-- user administration, company settings, stock adjustments, or team-wide sales.
INSERT INTO role_permissions(role, permission_id)
SELECT 'salesperson'::user_role, p.id
FROM permissions p
WHERE p.permission IN ('sales:read', 'sales:write', 'products:read', 'customers:read')
ON CONFLICT (role, permission_id) DO NOTHING;
