-- Adicionar método card_us a todos os produtos que têm payment_methods
UPDATE products 
SET payment_methods = payment_methods || '[{"id": "card_us", "name": "Credit Card (USD)", "countryFlag": "🇺🇸", "countryName": "United States", "enabled": true, "isUS": true, "image": "/lovable-uploads/3253c01d-89da-4a32-846f-4861dd03645c.png"}]'::jsonb
WHERE payment_methods IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(payment_methods) elem 
    WHERE elem->>'id' = 'card_us'
  );