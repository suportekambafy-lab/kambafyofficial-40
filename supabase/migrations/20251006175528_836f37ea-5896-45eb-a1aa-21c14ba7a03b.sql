-- Estornar o valor do saque deletado do vendedor victormuabi
INSERT INTO balance_transactions (
  user_id,
  type,
  amount,
  currency,
  description,
  order_id
) VALUES (
  'a349acdf-584c-441e-adf8-d4bbfe217254',
  'credit',
  1812109.96,
  'KZ',
  'Estorno de saque deletado - solicitação #5aa0f876-dd23-4808-938e-bdf5b70f799b',
  'refund_withdrawal_5aa0f876-dd23-4808-938e-bdf5b70f799b'
);