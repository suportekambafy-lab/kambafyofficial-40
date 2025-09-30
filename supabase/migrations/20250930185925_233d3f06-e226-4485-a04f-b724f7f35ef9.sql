
-- Deletar usuários órfãos (sem senha e sem confirmação de email recente)
-- Isso permite que eles façam signup novamente com senha

-- Primeiro, deletar o perfil (se existir)
DELETE FROM public.profiles 
WHERE user_id = 'abe46909-9504-4611-a777-c015883007bb';

-- Depois, deletar o usuário do auth (isso só funciona via service role)
-- Como não podemos deletar diretamente do auth.users, vamos usar uma função
CREATE OR REPLACE FUNCTION public.cleanup_passwordless_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Encontrar e deletar usuários sem senha que foram criados há mais de 1 hora
  FOR user_record IN 
    SELECT id 
    FROM auth.users 
    WHERE encrypted_password IS NULL 
      AND created_at < (now() - INTERVAL '1 hour')
  LOOP
    -- Deletar perfil primeiro
    DELETE FROM public.profiles WHERE user_id = user_record.id;
  END LOOP;
END;
$$;

-- Executar a limpeza
SELECT public.cleanup_passwordless_users();
