-- ✅ Remover os 2 saques pendentes que não descontaram o saldo
DELETE FROM public.withdrawal_requests
WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  AND status = 'pendente'
  AND amount = 92000
  AND created_at >= '2025-10-06 15:10:00'
  AND created_at <= '2025-10-06 15:12:00';