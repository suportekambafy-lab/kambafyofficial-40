
-- Cancelar as 2 vendas epesa de Leonardo Vilas Boas
UPDATE orders 
SET status = 'cancelled', updated_at = NOW()
WHERE id IN (
  '8945eaac-c2e2-4dee-9c1d-5e3d354b5e9d',
  'cebaa20c-e154-4709-88bb-2b7e603dd385'
);

-- Remover transações de crédito dessas vendas
DELETE FROM balance_transactions 
WHERE user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da'
AND order_id IN ('RVANKXRPI', '8C4W1MVCB');
