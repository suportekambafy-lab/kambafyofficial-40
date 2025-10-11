-- ❌ CORREÇÃO: Remover transações indevidas que inflaram o saldo

-- ETAPA 1: Remover estornos de saques que NÃO foram rejeitados (corrigido o cast)
DELETE FROM balance_transactions
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  AND type = 'credit'
  AND description = 'Estorno de saque rejeitado'
  AND order_id LIKE 'refund_withdrawal_%'
  AND REPLACE(order_id, 'refund_withdrawal_', '')::uuid NOT IN (
    SELECT id FROM withdrawal_requests 
    WHERE status = 'rejeitado' 
    AND user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  );

-- ETAPA 2: Remover vendas antigas com tipo "credit" (sistema legado, duplicadas)
DELETE FROM balance_transactions
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  AND type = 'credit'
  AND description LIKE 'Venda do produto:%'
  AND amount = 15000
  AND DATE(created_at) = '2025-10-10';

-- ETAPA 3: Recalcular saldo após limpeza
SELECT recalculate_user_balance('a349acdf-584c-441e-adf8-d4bbfe217254');

-- ETAPA 4: Verificar resultado final
SELECT 
  balance as saldo_final_corrigido,
  currency,
  updated_at as ultima_atualizacao
FROM customer_balances
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254';