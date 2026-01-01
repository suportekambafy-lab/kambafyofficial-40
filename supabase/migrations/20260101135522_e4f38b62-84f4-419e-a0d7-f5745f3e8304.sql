-- =====================================================
-- REVERTER: Restaurar saldos KZ do customer_balances (sistema correto)
-- =====================================================

-- 1. Restaurar saldos KZ de currency_balances usando customer_balances como fonte correta
UPDATE currency_balances cb
SET 
  balance = COALESCE(
    (SELECT balance FROM customer_balances old 
     WHERE old.user_id = cb.user_id AND old.currency = 'KZ'),
    cb.balance
  ),
  updated_at = now()
WHERE cb.currency = 'KZ';

-- 2. Verificar resultado
SELECT 
  cb.user_id,
  cb.balance as new_balance,
  old.balance as old_balance
FROM currency_balances cb
LEFT JOIN customer_balances old ON old.user_id = cb.user_id AND old.currency = 'KZ'
WHERE cb.currency = 'KZ' AND cb.user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254';