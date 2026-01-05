-- Corrigir sale_revenue da Carla Morais de 49.054,39 para 45.413,99 KZ
UPDATE balance_transactions 
SET amount = 45413.99
WHERE user_id = 'fc5f63ed-8493-4008-9602-a898b34b3c74'
  AND type = 'sale_revenue'
  AND amount = 49054.39;

-- Recalcular saldo da Carla Morais
SELECT recalculate_user_balance('fc5f63ed-8493-4008-9602-a898b34b3c74');