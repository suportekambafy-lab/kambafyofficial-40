-- Criar balance_transaction para o vendedor
INSERT INTO public.balance_transactions (
  user_id,
  type,
  amount,
  currency,
  description,
  order_id
)
SELECT 
  o.user_id,
  'sale_revenue',
  3 * 0.9101,
  'KZ',
  'Venda - Acesso vitalício ',
  o.id::text
FROM orders o
WHERE o.order_id = '1NLMERBXQ'
AND NOT EXISTS (
  SELECT 1 FROM balance_transactions bt WHERE bt.order_id = o.id::text
);