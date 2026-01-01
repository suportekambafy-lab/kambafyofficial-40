-- Restaurar currency_balances.balance para KZ usando os valores corretos de customer_balances
UPDATE public.currency_balances cc
SET 
  balance = cb.balance,
  updated_at = now()
FROM public.customer_balances cb
WHERE cc.user_id = cb.user_id
  AND cc.currency = 'KZ'
  AND cb.currency = 'KZ';

-- Também remover os registros AOA duplicados/incorretos (normalizar para KZ)
DELETE FROM public.currency_balances
WHERE currency = 'AOA';