-- Deletar registros existentes e criar novo com saldo zero
DELETE FROM public.customer_balances WHERE user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254';

-- Inserir registro de saldo zero para victormuabi20@gmail.com
INSERT INTO public.customer_balances (user_id, balance, currency)
VALUES ('a349acdf-584c-441e-adf8-d4bbfe217254', 0, 'KZ');