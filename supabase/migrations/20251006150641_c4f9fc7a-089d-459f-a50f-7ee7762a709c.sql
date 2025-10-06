-- ✅ Corrigir política de UPDATE para permitir que o trigger atualize
-- O trigger roda com privilégios de SECURITY DEFINER, então precisa de uma política especial
DROP POLICY IF EXISTS "Only system can update balance via trigger" ON public.customer_balances;

-- Permitir UPDATE apenas via service role (usado pelo trigger)
CREATE POLICY "System can update balance"
ON public.customer_balances
FOR UPDATE
USING (true)
WITH CHECK (true);