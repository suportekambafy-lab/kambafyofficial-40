-- Criar acesso para todos os order bumps que não têm bump_product_id mas têm bump_product_name
-- Busca o produto pelo nome e cria o acesso

WITH order_bumps_sem_acesso AS (
  SELECT DISTINCT
    o.order_id,
    o.customer_email,
    o.customer_name,
    o.created_at,
    o.order_bump_data->>'bump_product_name' as bump_product_name,
    (o.order_bump_data->>'bump_product_id')::uuid as bump_product_id
  FROM orders o
  WHERE o.status = 'completed'
    AND o.order_bump_data IS NOT NULL
    AND o.order_bump_data->>'bump_product_name' IS NOT NULL
    AND o.created_at > NOW() - INTERVAL '30 days' -- Últimos 30 dias
),
produtos_encontrados AS (
  SELECT 
    obs.*,
    p.id as product_id
  FROM order_bumps_sem_acesso obs
  LEFT JOIN products p ON 
    LOWER(TRIM(p.name)) = LOWER(TRIM(obs.bump_product_name))
    AND p.status = 'Ativo'
  WHERE p.id IS NOT NULL
)
INSERT INTO public.customer_access (
  customer_email,
  customer_name,
  product_id,
  order_id,
  access_granted_at,
  access_expires_at,
  is_active
)
SELECT 
  pf.customer_email,
  pf.customer_name,
  pf.product_id,
  pf.order_id || '-BUMP',
  pf.created_at,
  NULL::timestamp with time zone,
  true
FROM produtos_encontrados pf
WHERE NOT EXISTS (
  SELECT 1 FROM customer_access ca
  WHERE ca.customer_email = pf.customer_email
    AND ca.product_id = pf.product_id
)
ON CONFLICT (customer_email, product_id) DO NOTHING;