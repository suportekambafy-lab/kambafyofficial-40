-- ================================================
-- CORREÇÃO: Policy de profiles usando coluna errada
-- ================================================

-- Remover política com erro
DROP POLICY IF EXISTS "Public can view seller basic info for checkout" ON public.profiles;

-- Recriar com a coluna correta (user_id ao invés de id)
CREATE POLICY "Public can view seller basic info for checkout"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.user_id = profiles.user_id 
    AND products.status = 'Ativo'
  )
);