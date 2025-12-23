
-- Adicionar permissões para Fina Augusto e José Henriques
-- Todas as permissões EXCETO: withdrawals (saques) e payment_approval (aprovar pagamentos)

INSERT INTO admin_permissions (admin_id, permission)
SELECT au.id, p.permission
FROM admin_users au
CROSS JOIN (
  VALUES 
    ('users'),
    ('products'),
    ('orders'),
    ('affiliates'),
    ('partners'),
    ('identity_verification'),
    ('support'),
    ('analytics'),
    ('notifications'),
    ('settings'),
    ('logs')
) AS p(permission)
WHERE au.email IN ('augustonilzafina20@gmail.com', 'jhenriques396@gmail.com')
ON CONFLICT (admin_id, permission) DO NOTHING;
