-- Adicionar métodos de pagamento UK a todos os produtos existentes
-- Esta migração adiciona card_uk e klarna_uk ao array payment_methods de cada produto

UPDATE products
SET payment_methods = COALESCE(payment_methods, '[]'::jsonb) || 
  '[
    {"id": "card_uk", "name": "Card Payment", "enabled": true, "isUK": true, "countryFlag": "🇬🇧", "countryName": "United Kingdom"},
    {"id": "klarna_uk", "name": "Klarna", "enabled": true, "isUK": true, "countryFlag": "🇬🇧", "countryName": "United Kingdom"}
  ]'::jsonb
WHERE NOT (payment_methods @> '[{"id": "card_uk"}]'::jsonb);