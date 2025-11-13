-- Corrigir saldo negativo do vendedor Ravimo
-- 1. Deletar transações antigas de credit (valor bruto sem taxa - 86 transações)
DELETE FROM balance_transactions
WHERE user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da'
  AND type = 'credit'
  AND description LIKE '%Venda completada%';

-- 2. Deletar o debit duplicado do saque (manter apenas withdrawal)
DELETE FROM balance_transactions
WHERE user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da'
  AND type = 'debit'
  AND amount = -4232023.00
  AND description = 'Saque solicitado'
  AND order_id = 'withdrawal_b798d2b2-4691-4579-a698-9774845a93bf';

-- 3. Recalcular saldo baseado apenas nas transações corretas
SELECT admin_recalculate_seller_balance(
  'dd6cb74b-cb86-43f7-8386-f39b981522da'::uuid,
  false  -- não deletar mais credits, já deletamos manualmente
);