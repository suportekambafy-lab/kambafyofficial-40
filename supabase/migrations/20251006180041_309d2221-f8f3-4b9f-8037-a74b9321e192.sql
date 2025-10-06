-- Deletar o saque de 1.637.319,96 KZ do vendedor victormuabi
DELETE FROM withdrawal_requests 
WHERE id = '65f26aaa-081d-478f-a604-a14cbc7879ab';

-- Estornar o valor do saque deletado
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
  1637319.96,
  'KZ',
  'Estorno de saque deletado - solicitação #65f26aaa-081d-478f-a604-a14cbc7879ab',
  'refund_withdrawal_65f26aaa-081d-478f-a604-a14cbc7879ab'
);