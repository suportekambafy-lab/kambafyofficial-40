-- Remover Victor Muabi do sistema de administradores

DO $$
DECLARE
  admin_id_to_delete UUID;
BEGIN
  -- Buscar o ID do admin pelo email
  SELECT id INTO admin_id_to_delete
  FROM public.admin_users
  WHERE email = 'victormuabi20@gmail.com';
  
  -- Se encontrou o admin, deletar seus dados
  IF admin_id_to_delete IS NOT NULL THEN
    -- Deletar permissões
    DELETE FROM public.admin_permissions
    WHERE admin_id = admin_id_to_delete;
    
    -- Deletar logs (se houver)
    DELETE FROM public.admin_logs
    WHERE admin_id = admin_id_to_delete;
    
    -- Deletar o admin
    DELETE FROM public.admin_users
    WHERE id = admin_id_to_delete;
    
    RAISE NOTICE 'Admin Victor Muabi removido com sucesso';
  ELSE
    RAISE NOTICE 'Admin não encontrado';
  END IF;
END $$;