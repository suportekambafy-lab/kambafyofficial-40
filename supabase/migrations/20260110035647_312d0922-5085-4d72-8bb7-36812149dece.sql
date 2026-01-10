
-- Inserir transação de ajuste para corrigir receita da Carla Morais
-- Diferença para atingir 1.634.903 KZ em vendas totais
INSERT INTO balance_transactions (
  user_id,
  amount,
  currency,
  type,
  description
) VALUES (
  'fc5f63ed-8493-4008-9602-a898b34b3c74',
  148721.54,
  'KZ',
  'sale_revenue',
  'Ajuste de correção - vendas não contabilizadas corretamente'
);

-- Atualizar o saldo em currency_balances para refletir 1.134.903 KZ
UPDATE currency_balances 
SET balance = 1134903.00,
    updated_at = now()
WHERE user_id = 'fc5f63ed-8493-4008-9602-a898b34b3c74' 
AND currency = 'KZ';
