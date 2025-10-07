
-- ========================================
-- CORREÇÃO DIRETA: Ajustar saldo do Dario
-- ========================================

UPDATE public.customer_balances
SET 
  balance = 4500.00,
  updated_at = NOW()
WHERE user_id = 'a906647b-3e73-4ddc-a8ed-c00cdd7b8c31';
