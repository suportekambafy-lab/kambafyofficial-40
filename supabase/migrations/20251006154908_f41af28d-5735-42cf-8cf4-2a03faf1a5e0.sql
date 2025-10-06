-- Remove pending withdrawal request of 92,000 KZ for victormuabi20@gmail.com
DELETE FROM public.withdrawal_requests
WHERE id = '7187c6ef-c63c-4d8d-9db5-b33666883278'
  AND user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
  AND status = 'pendente'
  AND amount = 92000;