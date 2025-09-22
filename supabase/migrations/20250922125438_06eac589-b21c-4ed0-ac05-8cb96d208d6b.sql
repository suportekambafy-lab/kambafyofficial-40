-- Atualizar logo do Multicaixa Express nos produtos existentes
UPDATE public.products 
SET payment_methods = jsonb_set(
  payment_methods,
  '{0,image}',
  '"/lovable-uploads/multicaixa-express-logo.svg"'
)
WHERE payment_methods::text LIKE '%"id":"express"%';

-- Atualizar também produtos que podem ter o express em posições diferentes
UPDATE public.products 
SET payment_methods = (
  SELECT jsonb_agg(
    CASE 
      WHEN method->>'id' = 'express' THEN 
        jsonb_set(method, '{image}', '"/lovable-uploads/multicaixa-express-logo.svg"')
      ELSE method
    END
  )
  FROM jsonb_array_elements(payment_methods) AS method
)
WHERE payment_methods::text LIKE '%"id":"express"%';