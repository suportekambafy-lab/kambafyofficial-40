-- Corrigir ordens UK antigas para KZ (regra multi-moeda veio depois)
UPDATE orders 
SET 
  amount = '40000.95',
  currency = 'KZ',
  original_amount = 40000.95,
  original_currency = 'KZ'
WHERE order_id IN ('I4I9C35R9', '5T0UMHVZX');