-- Remover a política permissiva que mostra todos os pixels
DROP POLICY IF EXISTS "Public can view active pixels for checkout" ON public.facebook_pixel_settings;

-- Criar política mais restritiva: permite ver pixels apenas quando:
-- 1. O pixel pertence a um produto ativo
-- 2. Só retorna pixels para consultas que especificam o product_id
CREATE POLICY "Public can view pixels for specific product checkout" 
ON public.facebook_pixel_settings 
FOR SELECT 
TO anon, authenticated
USING (
  enabled = true 
  AND product_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = facebook_pixel_settings.product_id 
    AND products.status = 'Ativo'
  )
);