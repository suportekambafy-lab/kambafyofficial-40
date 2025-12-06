-- Atualizar o nome do método card_us para "Card Payment"
UPDATE products 
SET payment_methods = (
  SELECT jsonb_agg(
    CASE 
      WHEN elem->>'id' = 'card_us' 
      THEN jsonb_set(elem, '{name}', '"Card Payment"'::jsonb)
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

-- Adicionar preço personalizado para EUA (US) em todos os produtos que têm card_us
UPDATE products
SET custom_prices = COALESCE(custom_prices, '{}'::jsonb) || '{"US": "0"}'::jsonb
WHERE payment_methods IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(payment_methods) elem 
    WHERE elem->>'id' = 'card_us'
  )
  AND (custom_prices IS NULL OR NOT custom_prices ? 'US');