-- Criar transações de saldo para os vendedores
INSERT INTO public.balance_transactions (user_id, type, amount, currency, description, order_id)
SELECT 
  p.user_id,
  'sale_revenue',
  o.seller_commission,
  'KZ',
  'Venda Stripe - ' || p.name,
  o.id::text
FROM public.orders o
JOIN public.products p ON o.product_id = p.id
WHERE o.order_id IN ('I5ITCSEHP', 'YTD7QKIYE', '6R2ZWHYY1')
AND NOT EXISTS (
  SELECT 1 FROM public.balance_transactions bt 
  WHERE bt.order_id = o.id::text AND bt.type = 'sale_revenue'
);