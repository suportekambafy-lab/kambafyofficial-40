-- =============================================
-- CORREÇÃO DO SALDO DO WALLACE CARLOS SILVA
-- user_id: fd1b3c4d-a38c-4783-9d93-5803ecdc85be
-- =============================================

-- 1) Remover as 3 transações withdrawal_refund DUPLICADAS
-- (mantendo os 'credit' com order_id rastreável)
DELETE FROM balance_transactions 
WHERE id IN (
  'c8242abe-2e91-4aec-81a5-9d98b4e12153',  -- 207.502,80 KZ
  '3411d589-2127-47eb-ae8a-2ea2b80c7266',  -- 180.199,80 KZ
  '223f72d0-d01d-49ec-9513-2cada0854da3'   -- 172.008,90 KZ
);

-- 2) Atualizar currency_balances (subtrair valor duplicado: 559.711,50)
UPDATE currency_balances 
SET balance = balance - 559711.50, updated_at = now()
WHERE user_id = 'fd1b3c4d-a38c-4783-9d93-5803ecdc85be' 
AND currency = 'KZ';

-- 3) Sincronizar customer_balances para o valor correto
UPDATE customer_balances 
SET balance = 479855.75, updated_at = now()
WHERE user_id = 'fd1b3c4d-a38c-4783-9d93-5803ecdc85be';