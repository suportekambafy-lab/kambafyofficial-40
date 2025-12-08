-- Corrigir RLS para abandoned_purchases
-- Remover política restritiva e criar permissiva correta

DROP POLICY IF EXISTS "Product owners can view their abandoned purchases" ON public.abandoned_purchases;

-- Criar política permissiva que só permite donos de produtos verem
CREATE POLICY "Product owners can view their abandoned purchases" 
ON public.abandoned_purchases 
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM products p
  WHERE p.id = abandoned_purchases.product_id 
  AND p.user_id = auth.uid()
));

-- Corrigir RLS para admin_action_logs
DROP POLICY IF EXISTS "Only active admins can view action logs" ON public.admin_action_logs;
DROP POLICY IF EXISTS "System can insert logs" ON public.admin_action_logs;

-- Política permissiva para admins visualizarem logs
CREATE POLICY "Only active admins can view action logs" 
ON public.admin_action_logs 
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM admin_users
  WHERE admin_users.email = get_current_user_email()
  AND admin_users.is_active = true
));

-- Política para service role inserir logs (não para anon/authenticated)
CREATE POLICY "System can insert logs" 
ON public.admin_action_logs 
FOR INSERT 
TO service_role
WITH CHECK (true);