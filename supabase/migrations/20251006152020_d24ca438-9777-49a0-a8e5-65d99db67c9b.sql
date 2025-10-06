-- Fix customer_balances RLS policy to avoid auth.users access
DROP POLICY IF EXISTS "Users can view their own balance" ON customer_balances;

CREATE POLICY "Users can view their own balance"
ON customer_balances
FOR SELECT
USING (auth.uid() = user_id);

-- Also ensure System can update balance policy exists
DROP POLICY IF EXISTS "System can update balance" ON customer_balances;

CREATE POLICY "System can update balance"
ON customer_balances
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Ensure Users can create their own balance exists without auth.users dependency
DROP POLICY IF EXISTS "Users can create their own balance" ON customer_balances;

CREATE POLICY "Users can create their own balance"
ON customer_balances
FOR INSERT
WITH CHECK (auth.uid() = user_id);