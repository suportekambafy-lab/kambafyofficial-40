-- Remover Amado Ruben novamente
DELETE FROM public.admin_logs WHERE admin_id = '5d313fb8-d9c4-40f6-933d-98894cad00bb';
DELETE FROM public.admin_permissions WHERE admin_id = '5d313fb8-d9c4-40f6-933d-98894cad00bb';
DELETE FROM public.admin_users WHERE id = '5d313fb8-d9c4-40f6-933d-98894cad00bb';