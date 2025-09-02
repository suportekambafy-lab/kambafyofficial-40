-- Atualizar vendas antigas sem seller_commission
-- Para vendas em KZ, usar o valor do amount diretamente
UPDATE orders 
SET seller_commission = amount::numeric
WHERE seller_commission IS NULL 
  AND currency = 'KZ';

-- Para vendas em EUR, converter de volta para KZ (usando taxa aproximada)
UPDATE orders 
SET seller_commission = (amount::numeric * 1053)
WHERE seller_commission IS NULL 
  AND currency = 'EUR';

-- Para vendas em MZN, converter de volta para KZ (usando taxa aproximada) 
UPDATE orders 
SET seller_commission = (amount::numeric * 13)
WHERE seller_commission IS NULL 
  AND currency = 'MZN';

-- Para outras moedas, usar o valor do amount como fallback
UPDATE orders 
SET seller_commission = amount::numeric
WHERE seller_commission IS NULL;