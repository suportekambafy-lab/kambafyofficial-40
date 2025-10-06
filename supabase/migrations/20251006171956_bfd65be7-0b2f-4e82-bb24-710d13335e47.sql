-- Criar transações de débito para saques antigos que não têm
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
  wr.user_id,
  'debit',
  -wr.amount,
  'KZ',
  'Saque solicitado (retroativo)',
  'withdrawal_' || wr.id::text,
  wr.created_at
FROM withdrawal_requests wr
WHERE NOT EXISTS (
  SELECT 1 
  FROM balance_transactions bt 
  WHERE bt.order_id = 'withdrawal_' || wr.id::text
)
AND wr.status IN ('pendente', 'aprovado');

-- Atualizar customer_balances para saques antigos
UPDATE public.customer_balances cb
SET balance = balance - (
  SELECT COALESCE(SUM(wr.amount), 0)
  FROM withdrawal_requests wr
  LEFT JOIN balance_transactions bt ON bt.order_id = 'withdrawal_' || wr.id::text
  WHERE wr.user_id = cb.user_id
    AND wr.status IN ('pendente', 'aprovado')
    AND bt.id IS NULL
),
updated_at = NOW()
WHERE EXISTS (
  SELECT 1
  FROM withdrawal_requests wr
  LEFT JOIN balance_transactions bt ON bt.order_id = 'withdrawal_' || wr.id::text
  WHERE wr.user_id = cb.user_id
    AND wr.status IN ('pendente', 'aprovado')
    AND bt.id IS NULL
);