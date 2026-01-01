-- =============================================
-- CORRIGIR ESTORNOS DUPLICADOS DE 6 VENDEDORES
-- Remover withdrawal_refund duplicados do bug
-- =============================================

-- 1) Remover as 6 transações withdrawal_refund duplicadas
DELETE FROM balance_transactions 
WHERE id IN (
  '1e62a1bf-822e-47c8-ad5f-260f3ae3c350',
  '768e2be1-1635-427b-867d-fc21042b0f3e',
  '7dde4351-e141-4f9d-81a4-bd8d3fbcfaa8',
  'c94abdf6-4909-444c-a1b8-4728ce310fdf',
  '3fecf424-0513-4a65-aa1d-d7934aa4c318',
  'd082a337-c7ec-43bb-bc1f-d0c49ceb63a7'
);

-- 2) Atualizar currency_balances de cada vendedor
UPDATE currency_balances SET balance = balance - 227.53, updated_at = now()
WHERE user_id = '91162aae-d434-4801-83ed-7e70c9b00ee9' AND currency = 'KZ';

UPDATE currency_balances SET balance = balance - 43.20, updated_at = now()
WHERE user_id = 'a4797b81-e615-4dfb-97c9-d61700f2a180' AND currency = 'KZ';

UPDATE currency_balances SET balance = balance - 12.00, updated_at = now()
WHERE user_id = 'c3e42874-f7c1-4bb9-b9e5-38d453278b30' AND currency = 'KZ';

UPDATE currency_balances SET balance = balance - 10.01, updated_at = now()
WHERE user_id = '503f744c-3054-44b6-8d4d-3225cfacbb43' AND currency = 'KZ';

UPDATE currency_balances SET balance = balance - 9.10, updated_at = now()
WHERE user_id = '321639ba-3bb1-4199-b6d1-4505c2a98f03' AND currency = 'KZ';

UPDATE currency_balances SET balance = balance - 2.73, updated_at = now()
WHERE user_id = '1fb920f4-ae1c-4921-a53d-8e13db9e6916' AND currency = 'KZ';

-- 3) Sincronizar customer_balances
UPDATE customer_balances cb
SET balance = COALESCE((
  SELECT currb.balance 
  FROM currency_balances currb 
  WHERE currb.user_id = cb.user_id AND currb.currency = 'KZ'
), 0), updated_at = now()
WHERE cb.user_id IN (
  '91162aae-d434-4801-83ed-7e70c9b00ee9',
  'a4797b81-e615-4dfb-97c9-d61700f2a180',
  'c3e42874-f7c1-4bb9-b9e5-38d453278b30',
  '503f744c-3054-44b6-8d4d-3225cfacbb43',
  '321639ba-3bb1-4199-b6d1-4505c2a98f03',
  '1fb920f4-ae1c-4921-a53d-8e13db9e6916'
);