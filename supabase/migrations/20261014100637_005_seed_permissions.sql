/*
# Seed Default Permissions and Role-Permission Mappings

1. Data Seeded
- 30 permissions across 15 categories (companies, branches, users, customers, suppliers, products, inventory, sales, purchases, payments, expenses, reports, employees, payroll, settings, audit)
- Role-permission mappings:
  - owner: all 30 permissions
  - admin: all 30 permissions
  - manager: 27 permissions (all read + operational write, no users:write, payroll:write, settings:write)
  - staff: 18 permissions (operational read + limited write)
  - viewer: all read-only permissions (15 with :read suffix)
2. Security
- No security changes (data only)
3. Notes
- Idempotent: uses ON CONFLICT DO NOTHING on all inserts
- Safe to run multiple times
- No business records (companies, users, customers, etc.) are seeded — only permission catalog and role mappings
*/

INSERT INTO permissions (permission, description, category) VALUES
  ('companies:read',  'View company profiles',          'companies'),
  ('companies:write', 'Create and edit company profiles','companies'),
  ('branches:read',   'View branch details',            'branches'),
  ('branches:write',  'Create and edit branches',       'branches'),
  ('users:read',      'View users',                      'users'),
  ('users:write',     'Create and edit users',           'users'),
  ('customers:read',  'View customers',                  'customers'),
  ('customers:write', 'Create and edit customers',       'customers'),
  ('suppliers:read',  'View suppliers',                  'suppliers'),
  ('suppliers:write', 'Create and edit suppliers',       'suppliers'),
  ('products:read',   'View products',                   'products'),
  ('products:write',  'Create and edit products',        'products'),
  ('inventory:read',  'View inventory',                  'inventory'),
  ('inventory:write', 'Adjust inventory',                'inventory'),
  ('sales:read',      'View sales',                      'sales'),
  ('sales:write',     'Create and edit sales',           'sales'),
  ('purchases:read',  'View purchases',                  'purchases'),
  ('purchases:write', 'Create and edit purchases',       'purchases'),
  ('payments:read',   'View payments',                   'payments'),
  ('payments:write',  'Record payments',                 'payments'),
  ('expenses:read',   'View expenses',                   'expenses'),
  ('expenses:write',  'Record expenses',                 'expenses'),
  ('reports:read',    'View reports',                    'reports'),
  ('employees:read',  'View employees',                  'employees'),
  ('employees:write', 'Create and edit employees',       'employees'),
  ('payroll:read',    'View payroll',                    'payroll'),
  ('payroll:write',   'Run payroll',                     'payroll'),
  ('settings:read',   'View settings',                   'settings'),
  ('settings:write',  'Edit settings',                   'settings'),
  ('audit:read',      'View audit logs',                 'audit')
ON CONFLICT (permission) DO NOTHING;

-- Assign all permissions to owner and admin
INSERT INTO role_permissions (role, permission_id)
SELECT 'owner', id FROM permissions
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- Manager: all read + write for operational areas
INSERT INTO role_permissions (role, permission_id)
SELECT 'manager', id FROM permissions
WHERE permission IN (
  'companies:read', 'branches:read', 'branches:write',
  'users:read', 'customers:read', 'customers:write',
  'suppliers:read', 'suppliers:write', 'products:read', 'products:write',
  'inventory:read', 'inventory:write', 'sales:read', 'sales:write',
  'purchases:read', 'purchases:write', 'payments:read', 'payments:write',
  'expenses:read', 'expenses:write', 'reports:read',
  'employees:read', 'employees:write', 'payroll:read',
  'settings:read', 'audit:read'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Staff: operational read + limited write
INSERT INTO role_permissions (role, permission_id)
SELECT 'staff', id FROM permissions
WHERE permission IN (
  'companies:read', 'branches:read', 'users:read',
  'customers:read', 'customers:write', 'suppliers:read',
  'products:read', 'inventory:read', 'inventory:write',
  'sales:read', 'sales:write', 'purchases:read',
  'payments:read', 'expenses:read', 'expenses:write',
  'reports:read', 'employees:read', 'settings:read'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Viewer: read-only across the board
INSERT INTO role_permissions (role, permission_id)
SELECT 'viewer', id FROM permissions
WHERE permission LIKE '%:read'
ON CONFLICT (role, permission_id) DO NOTHING;
