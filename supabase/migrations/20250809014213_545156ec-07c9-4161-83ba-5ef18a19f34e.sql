-- Corrigir políticas RLS quebradas para customer_balances
DROP POLICY IF EXISTS "Users can view their own balance" ON public.customer_balances;
DROP POLICY IF EXISTS "Users can create their own balance" ON public.customer_balances;
DROP POLICY IF EXISTS "Users can update their own balance" ON public.customer_balances;

-- Recriar políticas corretas
CREATE POLICY "Users can view their own balance" ON public.customer_balances
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  (email IS NOT NULL AND email IN (
    SELECT email FROM auth.users WHERE id = auth.uid()
  ))
);

CREATE POLICY "Users can create their own balance" ON public.customer_balances
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR 
  (email IS NOT NULL AND user_id IS NULL)
);

CREATE POLICY "Users can update their own balance" ON public.customer_balances
FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  (email IS NOT NULL AND email IN (
    SELECT email FROM auth.users WHERE id = auth.uid()
  ))
);

-- Corrigir políticas para balance_transactions
DROP POLICY IF EXISTS "Users can view transactions by email" ON public.balance_transactions;

CREATE POLICY "Users can view their transactions" ON public.balance_transactions
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  (email IS NOT NULL AND email IN (
    SELECT email FROM auth.users WHERE id = auth.uid()
  ))
);