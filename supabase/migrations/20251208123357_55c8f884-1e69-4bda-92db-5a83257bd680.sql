-- ================================================
-- CORREÇÃO: abandoned_purchases - Dados de clientes expostos
-- ================================================

-- Remover política perigosa que permite acesso público
DROP POLICY IF EXISTS "Service role can manage abandoned purchases" ON public.abandoned_purchases;

-- Criar política segura APENAS para service_role
CREATE POLICY "Only service role can manage abandoned purchases"
ON public.abandoned_purchases
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Garantir que RLS está ativo e forçado
ALTER TABLE public.abandoned_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abandoned_purchases FORCE ROW LEVEL SECURITY;