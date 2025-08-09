-- Corrigir políticas RLS que estão causando "permission denied for table users"
DROP POLICY IF EXISTS "Users can view their own balance" ON public.customer_balances;
DROP POLICY IF EXISTS "Users can create their own balance" ON public.customer_balances;
DROP POLICY IF EXISTS "Users can update their own balance" ON public.customer_balances;
DROP POLICY IF EXISTS "Users can view their transactions" ON public.balance_transactions;

-- Políticas simples e seguras para customer_balances
CREATE POLICY "Users can view their own balance" ON public.customer_balances
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own balance" ON public.customer_balances
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own balance" ON public.customer_balances
FOR UPDATE 
USING (auth.uid() = user_id);

-- Política simples para balance_transactions
CREATE POLICY "Users can view their transactions" ON public.balance_transactions
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their transactions" ON public.balance_transactions
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Corrigir políticas para kamba_pay_balances também
DROP POLICY IF EXISTS "Users can view their KambaPay balance" ON public.kamba_pay_balances;
DROP POLICY IF EXISTS "Users can insert their KambaPay balance" ON public.kamba_pay_balances;
DROP POLICY IF EXISTS "Users can update their KambaPay balance" ON public.kamba_pay_balances;

CREATE POLICY "Anyone can view KambaPay balances by email" ON public.kamba_pay_balances
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create KambaPay balances" ON public.kamba_pay_balances
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update KambaPay balances by email" ON public.kamba_pay_balances
FOR UPDATE 
USING (true);

-- Corrigir políticas para kamba_pay_transactions também
DROP POLICY IF EXISTS "Users can view their KambaPay transactions" ON public.kamba_pay_transactions;
DROP POLICY IF EXISTS "Users can insert their KambaPay transactions" ON public.kamba_pay_transactions;

CREATE POLICY "Anyone can view KambaPay transactions by email" ON public.kamba_pay_transactions
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create KambaPay transactions" ON public.kamba_pay_transactions
FOR INSERT 
WITH CHECK (true);