
-- Criar registros de customer_access para pedidos completados que não têm acesso

-- 1. Criar acesso para o ebook "Lista de 100 produtos vencedores" 
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
  o.customer_email,
  o.customer_name,
  o.product_id,
  o.order_id,
  o.created_at,
  NULL, -- Acesso vitalício
  true
FROM orders o
WHERE o.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM customer_access ca 
    WHERE ca.customer_email = o.customer_email 
      AND ca.product_id = o.product_id
  )
  AND o.created_at > NOW() - INTERVAL '7 days'  -- Últimos 7 dias
ON CONFLICT (customer_email, product_id) DO NOTHING;
