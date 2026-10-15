INSERT INTO permissions(permission,description,category) VALUES
 ('sales:team-read','View company sales performance by invoice creator','sales')
ON CONFLICT(permission) DO NOTHING;

INSERT INTO role_permissions(role,permission_id)
SELECT role,id FROM permissions CROSS JOIN (VALUES ('owner'::user_role),('admin'::user_role),('manager'::user_role)) AS roles(role)
WHERE permission='sales:team-read'
ON CONFLICT(role,permission_id) DO NOTHING;
