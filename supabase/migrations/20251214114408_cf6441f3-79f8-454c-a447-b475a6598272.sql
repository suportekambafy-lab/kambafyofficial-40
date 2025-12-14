
-- =====================================================
-- CORREÇÃO CRÍTICA: Lógica de saldo com debits negativos
-- =====================================================

-- 1. Remover transações sale_revenue de orders que não estão completed
DELETE FROM balance_transactions bt
WHERE bt.type = 'sale_revenue'
  AND bt.order_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.order_id = bt.order_id 
    AND o.status = 'completed'
  );

-- 2. Recalcular TODOS os saldos com a fórmula correta
-- Debits JÁ SÃO NEGATIVOS, então basta somar tudo
UPDATE customer_balances cb
SET 
  balance = COALESCE((
    SELECT SUM(
      CASE 
        -- Credits são sempre positivos
        WHEN bt.type IN ('credit', 'sale_revenue', 'affiliate_commission', 'order_bump_revenue', 'module_sale_revenue') 
        THEN ABS(bt.amount)
        -- Debits e withdrawals: se já são negativos, soma direto; se positivos, subtrai
        WHEN bt.type IN ('debit', 'withdrawal', 'platform_fee')
        THEN CASE WHEN bt.amount < 0 THEN bt.amount ELSE -bt.amount END
        ELSE bt.amount
      END
    )
    FROM balance_transactions bt
    WHERE bt.user_id = cb.user_id
  ), 0),
  updated_at = now();

-- 3. Verificar resultado para o usuário problemático
-- SELECT balance FROM customer_balances WHERE user_id = 'b3c2ce3f-b76e-47b8-8e00-d456dd44e09e';
