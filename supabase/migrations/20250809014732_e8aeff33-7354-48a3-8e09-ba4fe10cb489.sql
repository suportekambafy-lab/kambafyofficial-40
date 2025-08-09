-- Corrigir apenas as políticas RLS que estão causando "permission denied for table users"
-- para customer_balances e balance_transactions

-- Remover políticas problemáticas de customer_balances
DROP POLICY IF EXISTS "Users can view their own balance" ON public.customer_balances;
DROP POLICY IF EXISTS "Users can create their own balance" ON public.customer_balances;
DROP POLICY IF EXISTS "Users can update their own balance" ON public.customer_balances;

-- Remover políticas problemáticas de balance_transactions  
DROP POLICY IF EXISTS "Users can view their transactions" ON public.balance_transactions;

-- Recriar políticas simples para customer_balances (sem referenciar auth.users)
CREATE POLICY "Users can view their own balance" ON public.customer_balances
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own balance" ON public.customer_balances
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own balance" ON public.customer_balances
FOR UPDATE 
USING (auth.uid() = user_id);

-- Recriar políticas simples para balance_transactions
CREATE POLICY "Users can view their transactions" ON public.balance_transactions
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their transactions" ON public.balance_transactions
FOR INSERT 
WITH CHECK (auth.uid() = user_id);