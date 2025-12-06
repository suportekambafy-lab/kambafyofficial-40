-- Remover o preço personalizado US que foi definido como "0" para restaurar conversão automática
UPDATE products
SET custom_prices = custom_prices - 'US'
WHERE custom_prices IS NOT NULL 
  AND custom_prices ? 'US'
  AND custom_prices->>'US' = '0';

-- Também remover dos order_bump_settings
UPDATE order_bump_settings
SET bump_product_id = bump_product_id
WHERE bump_product_id IN (
  SELECT id FROM products WHERE custom_prices ? 'US' AND custom_prices->>'US' = '0'
);