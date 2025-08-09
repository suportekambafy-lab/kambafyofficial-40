-- Corrigir políticas RLS para permitir registro KambaPay sem user_id

-- Primeiro, corrigir a política de customer_balances para permitir inserção sem user_id
DROP POLICY IF EXISTS "Users can create their own balance" ON public.customer_balances;

CREATE POLICY "Users can create their own balance" ON public.customer_balances
FOR INSERT 
WITH CHECK (
  -- Permite se o user_id for do usuário autenticado
  (auth.uid() = user_id) OR 
  -- Permite se for uma inserção por email sem user_id (para KambaPay)
  (user_id IS NULL AND email IS NOT NULL)
);

-- Corrigir a política de visualização para incluir registros por email
DROP POLICY IF EXISTS "Users can view their own balance" ON public.customer_balances;

CREATE POLICY "Users can view their own balance" ON public.customer_balances
FOR SELECT 
USING (
  -- Permite se o user_id for do usuário autenticado
  (auth.uid() = user_id) OR 
  -- Permite visualizar por email (para KambaPay)
  (email IS NOT NULL)
);

-- Corrigir a política de atualização
DROP POLICY IF EXISTS "Users can update their own balance" ON public.customer_balances;

CREATE POLICY "Users can update their own balance" ON public.customer_balances
FOR UPDATE 
USING (
  -- Permite se o user_id for do usuário autenticado
  (auth.uid() = user_id) OR 
  -- Permite atualizar por email (para KambaPay)
  (email IS NOT NULL)
);

-- Corrigir política de inserção de transações
DROP POLICY IF EXISTS "Users can create their transactions" ON public.balance_transactions;

CREATE POLICY "Users can create their transactions" ON public.balance_transactions
FOR INSERT 
WITH CHECK (
  -- Permite se o user_id for do usuário autenticado
  (auth.uid() = user_id) OR 
  -- Permite se for uma inserção por email sem user_id (para KambaPay)
  (user_id IS NULL AND email IS NOT NULL)
);