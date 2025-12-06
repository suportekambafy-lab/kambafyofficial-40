-- Corrigir ordem MBway: status para 'completed' e valor em KZ
-- Taxa de conversão EUR para KZ: aproximadamente 1000 (€17.26 = 17260 KZ)
-- Mas o usuário disse que deveria ser 17281 KZ, então vamos usar esse valor

UPDATE orders 
SET 
  status = 'completed',
  amount = '17281',
  currency = 'KZ',
  seller_commission = 17281 - (17281 * 0.0899), -- ~15728.46 KZ
  updated_at = NOW()
WHERE stripe_payment_intent_id = 'pi_3SbHfjGfoQ3QRz9A09QERTGG';

-- Atualizar transação de saldo para KZ
UPDATE balance_transactions
SET 
  amount = 17281 - (17281 * 0.0899), -- ~15728.46 KZ (comissão da vendedora após taxa 8.99%)
  currency = 'KZ'
WHERE order_id = 'STRIPE-MBWAY-20251206114649'
  AND user_id = '82dfd59f-d45e-41ef-a02d-5b2ee843cf62';

-- Recalcular saldo da vendedora
SELECT public.recalculate_user_balance('82dfd59f-d45e-41ef-a02d-5b2ee843cf62');