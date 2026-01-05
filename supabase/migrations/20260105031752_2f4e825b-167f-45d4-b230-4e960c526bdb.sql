-- Criar o débito que faltou para o saque de EUR
INSERT INTO public.balance_transactions (
  user_id,
  type,
  amount,
  currency,
  description,
  order_id
)
VALUES (
  'a349acdf-584c-441e-adf8-d4bbfe217254',
  'debit',
  -26.33,
  'EUR',
  'Saque solicitado',
  'withdrawal_7c9742f4-2c5d-447e-bba8-59aac6df9935'
)
ON CONFLICT DO NOTHING;

-- Recalcular o saldo EUR do usuário
SELECT recalculate_user_balance('a349acdf-584c-441e-adf8-d4bbfe217254');