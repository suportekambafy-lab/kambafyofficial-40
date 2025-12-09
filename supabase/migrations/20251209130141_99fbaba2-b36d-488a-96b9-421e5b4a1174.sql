-- Corrigir valores das orders para KZ
UPDATE public.orders SET 
  amount = '123420',
  currency = 'KZ',
  seller_commission = 123420 * 0.9101
WHERE order_id = 'I5ITCSEHP';

UPDATE public.orders SET 
  amount = '16082',
  currency = 'KZ', 
  seller_commission = 16082 * 0.9101
WHERE order_id = 'YTD7QKIYE';

UPDATE public.orders SET 
  amount = '5500',
  currency = 'KZ',
  seller_commission = 5500 * 0.9101
WHERE order_id = '6R2ZWHYY1';

-- Atualizar também as transações de saldo para KZ
UPDATE public.balance_transactions SET 
  amount = 123420 * 0.9101
WHERE order_id = (SELECT id::text FROM orders WHERE order_id = 'I5ITCSEHP');

UPDATE public.balance_transactions SET 
  amount = 16082 * 0.9101
WHERE order_id = (SELECT id::text FROM orders WHERE order_id = 'YTD7QKIYE');

UPDATE public.balance_transactions SET 
  amount = 5500 * 0.9101
WHERE order_id = (SELECT id::text FROM orders WHERE order_id = '6R2ZWHYY1');