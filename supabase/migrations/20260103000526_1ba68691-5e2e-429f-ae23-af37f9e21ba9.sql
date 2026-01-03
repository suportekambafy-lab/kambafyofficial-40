-- Corrigir saldo da vendedora fc5f63ed-8493-4008-9602-a898b34b3c74
-- Dashboard mostra 1.529.866,27 KZ mas currency_balances tem 1.543.683,89 KZ
-- Diferença: 13.817,62 KZ a mais no Financeiro

-- 1. Inserir transação de débito para auditoria
INSERT INTO balance_transactions (
  user_id,
  type,
  amount,
  currency,
  description,
  created_at
) VALUES (
  'fc5f63ed-8493-4008-9602-a898b34b3c74',
  'debit',
  -13817.62,
  'KZ',
  'Correcção de saldo: ajuste para sincronizar com cálculo real das vendas do Dashboard',
  NOW()
);

-- 2. Actualizar o saldo para o valor correcto
UPDATE currency_balances
SET balance = 1529866.27,
    updated_at = NOW()
WHERE user_id = 'fc5f63ed-8493-4008-9602-a898b34b3c74'
AND currency = 'KZ';