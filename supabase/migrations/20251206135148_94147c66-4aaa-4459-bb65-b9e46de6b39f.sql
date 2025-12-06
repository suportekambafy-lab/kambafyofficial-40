-- Atualizar o nome do método card_us para remover USD
UPDATE products 
SET payment_methods = (
  SELECT jsonb_agg(
    CASE 
      WHEN elem->>'id' = 'card_us' 
      THEN jsonb_set(elem, '{name}', '"Credit Card"'::jsonb)
      ELSE elem 
    END
  )
  FROM jsonb_array_elements(payment_methods) elem
)
WHERE payment_methods IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(payment_methods) elem 
    WHERE elem->>'id' = 'card_us'
  );