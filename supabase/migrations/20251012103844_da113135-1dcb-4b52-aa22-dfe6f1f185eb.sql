-- Corrigir transações antigas com desconto duplo
-- Garantir que saldo = seller_commission (sem descontos adicionais)

-- Passo 1: Deletar transações incorretas (desconto duplo)
DELETE FROM balance_transactions
WHERE order_id IN (
  SELECT o.order_id
  FROM orders o
  WHERE o.seller_commission IS NOT NULL 
    AND o.seller_commission > 0
    AND o.status = 'completed'
    AND o.created_at < '2025-10-12 10:28:00'
    AND EXISTS (
      SELECT 1 FROM balance_transactions bt
      WHERE bt.order_id = o.order_id
      AND bt.type = 'sale_revenue'
      AND ABS(bt.amount - o.seller_commission) > 0.01
    )
);

-- Passo 2: Temporariamente mudar status para pending
UPDATE orders 
SET status = 'pending'
WHERE seller_commission IS NOT NULL 
  AND seller_commission > 0
  AND created_at < '2025-10-12 10:28:00'
  AND NOT EXISTS (
    SELECT 1 FROM balance_transactions bt
    WHERE bt.order_id = orders.order_id
    AND bt.type = 'sale_revenue'
  );

-- Passo 3: Voltar para completed (trigger vai criar transações corretas)
UPDATE orders 
SET status = 'completed'
WHERE seller_commission IS NOT NULL 
  AND seller_commission > 0
  AND created_at < '2025-10-12 10:28:00'
  AND status = 'pending';

-- Passo 4: Recalcular todos os saldos
DO $$
DECLARE
  user_record RECORD;
  correct_balance NUMERIC;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM balance_transactions 
    WHERE user_id IS NOT NULL
  LOOP
    SELECT COALESCE(SUM(amount), 0) INTO correct_balance
    FROM balance_transactions
    WHERE user_id = user_record.user_id;
    
    UPDATE customer_balances
    SET balance = correct_balance, updated_at = NOW()
    WHERE user_id = user_record.user_id;
    
    IF NOT FOUND THEN
      INSERT INTO customer_balances (user_id, balance, currency)
      VALUES (user_record.user_id, correct_balance, 'KZ');
    END IF;
  END LOOP;
END $$;