-- ✅ Remover transações de débito criadas incorretamente para saques pendentes
-- Essas transações não deveriam ter sido criadas até a aprovação do saque

DELETE FROM public.balance_transactions
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  AND type = 'debit'
  AND amount = -100000
  AND created_at >= '2025-10-06 15:10:00'
  AND created_at <= '2025-10-06 15:12:00'
  AND description LIKE 'Saque solicitado%';

-- ✅ Recalcular saldo correto em customer_balances
UPDATE public.customer_balances
SET balance = (
  SELECT COALESCE(SUM(amount), 0)
  FROM public.balance_transactions
  WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
),
updated_at = now()
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254';