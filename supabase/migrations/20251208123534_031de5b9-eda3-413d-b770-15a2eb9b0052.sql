-- ================================================
-- CORREÇÃO: Permitir checkout ler dados básicos do vendedor
-- ================================================

-- Política para permitir leitura pública de dados básicos do vendedor
-- Apenas para vendedores com produtos ativos
CREATE POLICY "Public can view seller basic info for checkout"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.user_id = profiles.id 
    AND products.status = 'Ativo'
  )
);