
-- Atualizar políticas para permitir que administradores vejam e gerenciem todas as solicitações de saque

-- Primeiro, vamos remover as políticas existentes que são muito restritivas
DROP POLICY IF EXISTS "Users can view their own withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can update their own withdrawal requests" ON public.withdrawal_requests;

-- Criar nova política para visualização que permite tanto usuários verem seus próprios saques quanto admins verem todos
CREATE POLICY "Users and admins can view withdrawal requests" 
ON public.withdrawal_requests 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = get_current_user_email() AND is_active = true
  )
);

-- Criar nova política para atualização que permite tanto usuários atualizarem seus próprios saques quanto admins atualizarem qualquer saque
CREATE POLICY "Users and admins can update withdrawal requests" 
ON public.withdrawal_requests 
FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = get_current_user_email() AND is_active = true
  )
);

-- Manter a política de criação como está (usuários podem criar seus próprios saques)
-- A política "Users can create their own withdrawal requests" já existe e está correta
