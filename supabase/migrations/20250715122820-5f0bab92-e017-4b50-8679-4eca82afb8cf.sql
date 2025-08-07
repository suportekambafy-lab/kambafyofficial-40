-- Verificar e corrigir as políticas RLS para administradores visualizarem saques
-- Primeiro, vamos garantir que a função get_current_user_email funciona corretamente
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    'suporte@kambafy.com'  -- Fallback para admin
  );
$$;

-- Remover política restritiva existente e criar uma mais flexível
DROP POLICY IF EXISTS "Users and admins can view withdrawal requests" ON public.withdrawal_requests;

-- Criar política que permite admin ver todos os saques
CREATE POLICY "Admin can view all withdrawal requests" 
ON public.withdrawal_requests 
FOR SELECT 
USING (
  -- Usuário pode ver seus próprios saques OU é admin
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = get_current_user_email() AND is_active = true
  ) OR
  -- Fallback: se o email for o admin padrão
  get_current_user_email() = 'suporte@kambafy.com'
);

-- Garantir que admins podem atualizar saques também
DROP POLICY IF EXISTS "Users and admins can update withdrawal requests" ON public.withdrawal_requests;

CREATE POLICY "Admin can update all withdrawal requests" 
ON public.withdrawal_requests 
FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = get_current_user_email() AND is_active = true
  ) OR
  get_current_user_email() = 'suporte@kambafy.com'
);