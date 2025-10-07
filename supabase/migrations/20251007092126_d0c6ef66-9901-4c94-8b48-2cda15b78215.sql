-- Desabilitar Apple Pay em todos os produtos que estavam usando
UPDATE products
SET payment_methods = (
  SELECT jsonb_agg(
    CASE 
      WHEN method->>'id' = 'apple_pay' 
      THEN jsonb_set(method, '{enabled}', 'false'::jsonb)
      ELSE method
    END
  )
  FROM jsonb_array_elements(payment_methods) AS method
)
WHERE payment_methods IS NOT NULL
AND EXISTS (
  SELECT 1 
  FROM jsonb_array_elements(payment_methods) AS method 
  WHERE method->>'id' = 'apple_pay'
);