-- ✅ Corrigir políticas RLS para customer_balances
-- Remover políticas antigas que podem estar causando conflito
DROP POLICY IF EXISTS "Authenticated users can view own balance data only" ON public.customer_balances;
DROP POLICY IF EXISTS "Authenticated users can create own balance only" ON public.customer_balances;
DROP POLICY IF EXISTS "Authenticated users can update own balance only" ON public.customer_balances;
DROP POLICY IF EXISTS "System operations for balance management" ON public.customer_balances;

-- ✅ Criar políticas RLS simplificadas e corretas
-- Usuários podem ver seu próprio saldo (por user_id ou email)
CREATE POLICY "Users can view their own balance"
ON public.customer_balances
FOR SELECT
USING (
  auth.uid() = user_id 
  OR 
  (email IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Usuários podem criar seu próprio saldo inicial
CREATE POLICY "Users can create their own balance"
ON public.customer_balances
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  OR 
  (email IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- ✅ IMPORTANTE: Apenas o trigger pode atualizar o saldo (via transações)
-- Usuários NÃO podem atualizar diretamente
CREATE POLICY "Only system can update balance via trigger"
ON public.customer_balances
FOR UPDATE
USING (false)
WITH CHECK (false);

-- Permitir deleção apenas pelo próprio usuário (para casos especiais)
CREATE POLICY "Users can delete their own balance"
ON public.customer_balances
FOR DELETE
USING (auth.uid() = user_id);