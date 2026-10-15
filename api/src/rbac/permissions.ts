export type Permission =
  | 'companies:read' | 'companies:write'
  | 'branches:read' | 'branches:write'
  | 'users:read' | 'users:write'
  | 'crm:read' | 'crm:write'
  | 'customers:read' | 'customers:write'
  | 'suppliers:read' | 'suppliers:write'
  | 'products:read' | 'products:write'
  | 'inventory:read' | 'inventory:write'
  | 'sales:read' | 'sales:write'
  | 'purchases:read' | 'purchases:write'
  | 'payments:read' | 'payments:write'
  | 'expenses:read' | 'expenses:write'
  | 'reports:read'
  | 'employees:read' | 'employees:write'
  | 'payroll:read' | 'payroll:write' | 'payroll:approve'
  | 'settings:read' | 'settings:write'
  | 'audit:read'
  | 'accounting:read' | 'accounting:write'
  | 'manufacturing:read' | 'manufacturing:write'
  | 'attendance:read' | 'attendance:write'
  | 'assignments:read' | 'assignments:write';

export type RoleName = 'owner' | 'admin' | 'manager' | 'staff' | 'viewer';
