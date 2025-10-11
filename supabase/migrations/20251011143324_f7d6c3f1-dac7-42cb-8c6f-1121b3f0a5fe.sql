-- Função para criar usuário no auth.users quando admin é criado
CREATE OR REPLACE FUNCTION public.create_auth_user_for_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar usuário no auth.users com email e senha do admin
  -- Nota: A senha já vem hasheada do frontend
  INSERT INTO auth.users (
    email,
    email_confirmed_at,
    raw_user_meta_data,
    role,
    aud,
    encrypted_password
  ) VALUES (
    NEW.email,
    NOW(), -- Email já confirmado
    jsonb_build_object(
      'full_name', NEW.full_name,
      'is_admin', true
    ),
    'authenticated',
    'authenticated',
    NEW.password_hash -- Usar o hash de senha já fornecido
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Se o usuário já existe, apenas continuar
    RAISE NOTICE 'Erro ao criar usuário auth para admin %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Trigger para criar automaticamente usuário auth quando admin é inserido
DROP TRIGGER IF EXISTS create_auth_user_on_admin_insert ON public.admin_users;
CREATE TRIGGER create_auth_user_on_admin_insert
  AFTER INSERT ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_auth_user_for_admin();

COMMENT ON FUNCTION public.create_auth_user_for_admin() IS 'Cria automaticamente um usuário no auth.users quando um admin é adicionado';
COMMENT ON TRIGGER create_auth_user_on_admin_insert ON public.admin_users IS 'Trigger que cria usuário auth automaticamente para novos admins';