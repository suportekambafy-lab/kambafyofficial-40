-- Desativar e-Mola e e-Pesa em todos os produtos
UPDATE products
SET payment_methods = (
  SELECT jsonb_agg(
    CASE 
      WHEN elem->>'id' IN ('emola', 'epesa') THEN
        jsonb_set(elem, '{enabled}', 'false'::jsonb)
      ELSE
        elem
    END
  )
  FROM jsonb_array_elements(payment_methods) elem
)
WHERE payment_methods IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(payment_methods) elem
    WHERE elem->>'id' IN ('emola', 'epesa')
      AND (elem->>'enabled')::boolean = true
  );