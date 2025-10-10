-- Creditar todas as liberações pendentes que já deveriam ter sido pagas
INSERT INTO public.balance_transactions (
  user_id,
  type,
  amount,
  currency,
  description,
  order_id,
  created_at
)
SELECT 
  o.user_id,
  'credit',
  pr.amount * 0.92, -- 92% após taxa de 8%
  'KZ',
  'Crédito de liberação automática (3 dias)',
  pr.order_id,
  NOW()
FROM public.payment_releases pr
JOIN public.orders o ON pr.order_id = o.order_id
LEFT JOIN public.balance_transactions bt ON bt.order_id = pr.order_id AND bt.type = 'credit'
WHERE pr.release_date <= NOW()
  AND bt.id IS NULL;