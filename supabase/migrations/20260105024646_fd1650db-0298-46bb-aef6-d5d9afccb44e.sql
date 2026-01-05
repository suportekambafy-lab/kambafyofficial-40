-- Corrigir montantes das ordens UK que foram gravadas incorretamente
UPDATE orders 
SET 
  amount = '40000.95',
  original_amount = 40.95,
  original_currency = 'GBP'
WHERE order_id IN ('I4I9C35R9', '5T0UMHVZX');