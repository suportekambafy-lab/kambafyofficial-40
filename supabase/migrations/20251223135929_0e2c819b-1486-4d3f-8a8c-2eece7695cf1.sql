-- Adicionar permissão manage_transactions para todos os admins (exceto super_admin que já tem tudo)
INSERT INTO admin_permissions (admin_id, permission)
SELECT id, 'manage_transactions'
FROM admin_users
WHERE role != 'super_admin'
ON CONFLICT DO NOTHING;