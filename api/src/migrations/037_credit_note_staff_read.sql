-- 037_credit_note_staff_read.sql
-- Staff can view credit-note history but only owners/admins may issue credits.
INSERT INTO role_permissions(role,permission_id)
SELECT 'staff',id FROM permissions WHERE permission='credit-notes:read'
ON CONFLICT(role,permission_id) DO NOTHING;
