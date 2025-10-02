-- Criar acesso para order bumps comprados nos últimos 7 dias
INSERT INTO public.customer_access (
  customer_email,
  customer_name,
  product_id,
  order_id,
  access_granted_at,
  access_expires_at,
  is_active
)
SELECT DISTINCT
  o.customer_email,
  o.customer_name,
  (o.order_bump_data->>'bump_product_id')::uuid as product_id,
  o.order_id || '-BUMP' as order_id,
  o.created_at as access_granted_at,
  NULL::timestamp with time zone as access_expires_at,
  true as is_active
FROM orders o
WHERE o.status = 'completed'
  AND o.order_bump_data IS NOT NULL
  AND o.order_bump_data->>'bump_product_id' IS NOT NULL
  AND (o.order_bump_data->>'bump_product_id')::uuid IS NOT NULL
  AND o.created_at > NOW() - INTERVAL '7 days'
  AND NOT EXISTS (
    SELECT 1 FROM customer_access ca
    WHERE ca.customer_email = o.customer_email
      AND ca.product_id = (o.order_bump_data->>'bump_product_id')::uuid
  )
ON CONFLICT (customer_email, product_id) DO NOTHING;