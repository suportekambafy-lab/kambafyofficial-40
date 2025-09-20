-- Atualizar o order bump para referenciar o produto correto "100 produtos vencedores"
UPDATE public.order_bump_settings 
SET bump_product_id = (
  SELECT id 
  FROM public.products 
  WHERE name ILIKE '%100 produtos vencedores%' 
     OR name ILIKE '%100%produtos%'
     OR name ILIKE '%produtos vencedores%'
  ORDER BY created_at DESC
  LIMIT 1
)
WHERE id = '89360e8d-d335-4ef9-be10-7bdfacf265ea'
  AND bump_product_id IS NULL;