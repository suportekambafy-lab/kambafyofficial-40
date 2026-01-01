-- Atualizar saldo de Carla Morais para 1.484.452,28 KZ
UPDATE currency_balances 
SET balance = 1484452.28, updated_at = now()
WHERE user_id = 'fc5f63ed-8493-4008-9602-a898b34b3c74' AND currency = 'KZ';

-- Verificar
SELECT balance FROM currency_balances 
WHERE user_id = 'fc5f63ed-8493-4008-9602-a898b34b3c74' AND currency = 'KZ';