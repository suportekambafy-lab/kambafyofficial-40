
-- ================================================
-- CORREÇÃO: Restaurar acesso a facebook_pixel_settings para checkout
-- De forma segura - apenas pixels ativos para produtos ativos
-- ================================================

-- Criar política que permite ver pixels apenas para produtos ativos durante checkout
CREATE POLICY "Public can view active pixels for checkout"
ON public.facebook_pixel_settings
FOR SELECT
TO anon, authenticated
USING (
  enabled = true
  AND (
    -- Pixel associado a um produto
    product_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM products
      WHERE products.id = facebook_pixel_settings.product_id
      AND products.status = 'Ativo'
    )
  )
);
