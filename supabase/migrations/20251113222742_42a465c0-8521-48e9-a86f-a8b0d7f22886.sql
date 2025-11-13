-- Deletar TODOS os créditos antigos do Ravimo (manter apenas sale_revenue)
DELETE FROM balance_transactions
WHERE user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da'
  AND type = 'credit';

-- Recalcular saldo final
SELECT admin_recalculate_seller_balance(
  'dd6cb74b-cb86-43f7-8386-f39b981522da'::uuid,
  false
);