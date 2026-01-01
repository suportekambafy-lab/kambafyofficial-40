-- Criar/atualizar currency_balances para moedas não-KZ baseado em balance_transactions
INSERT INTO public.currency_balances (user_id, currency, balance, retained_balance)
SELECT 
  bt.user_id,
  bt.currency,
  SUM(bt.amount) as balance,
  0 as retained_balance
FROM public.balance_transactions bt
WHERE bt.user_id IS NOT NULL
  AND bt.currency != 'KZ'
GROUP BY bt.user_id, bt.currency
ON CONFLICT (user_id, currency)
DO UPDATE SET
  balance = EXCLUDED.balance,
  updated_at = now();