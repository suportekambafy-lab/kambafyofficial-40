-- Parte 1: Remover transações duplicadas sale_revenue com user_id NULL
DELETE FROM balance_transactions
WHERE type = 'sale_revenue'
  AND user_id IS NULL;

-- Parte 2: Corrigir saldo de carla.morais592@gmail.com (fc5f63ed-8493-4008-9602-a898b34b3c74)
UPDATE currency_balances 
SET balance = 1498269.90, updated_at = now()
WHERE user_id = 'fc5f63ed-8493-4008-9602-a898b34b3c74' AND currency = 'KZ';

UPDATE customer_balances 
SET balance = 1498269.90, updated_at = now()
WHERE user_id = 'fc5f63ed-8493-4008-9602-a898b34b3c74';

-- Parte 3: Criar transações de sale_revenue para module_payments faltantes
INSERT INTO balance_transactions (user_id, type, amount, currency, order_id, description)
SELECT 
  ma.user_id,
  'sale_revenue',
  mp.amount * 0.92,
  'KZ',
  mp.id::text,
  'Receita de módulo pago (líquido após 8% taxa)'
FROM module_payments mp
JOIN member_areas ma ON ma.id = mp.member_area_id
WHERE mp.id IN ('d34885c7-3ac9-4b03-a4f5-22266331cc4c', 'db46a888-d628-432c-b755-dac18aa808e4');