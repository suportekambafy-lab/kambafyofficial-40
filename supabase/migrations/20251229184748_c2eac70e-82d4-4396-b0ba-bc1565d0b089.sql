-- Atualizar todos os produtos para ter os métodos de pagamento de Moçambique ativados
-- Esta migração:
-- 1. Remove métodos antigos de Moçambique (incluindo epesa que foi descontinuado)
-- 2. Adiciona os 3 métodos atuais: emola, mpesa, card_mz

UPDATE products
SET payment_methods = (
  -- Combinar métodos não-Moçambique existentes com os novos métodos de Moçambique
  SELECT COALESCE(
    (
      -- Filtrar métodos que NÃO são de Moçambique
      SELECT jsonb_agg(elem)
      FROM jsonb_array_elements(COALESCE(payment_methods, '[]'::jsonb)) elem
      WHERE NOT COALESCE((elem->>'isMozambique')::boolean, false)
        AND elem->>'id' NOT IN ('epesa', 'emola', 'mpesa', 'card_mz')
    ),
    '[]'::jsonb
  ) || jsonb_build_array(
    -- e-Mola
    jsonb_build_object(
      'id', 'emola',
      'name', 'e-Mola',
      'image', '/lovable-uploads/70243346-a1ea-47dc-8ef7-abbd4a3d66a4.png',
      'enabled', true,
      'isMozambique', true,
      'countryFlag', '🇲🇿',
      'countryName', 'Moçambique'
    ),
    -- M-Pesa
    jsonb_build_object(
      'id', 'mpesa',
      'name', 'M-Pesa',
      'image', '/lovable-uploads/4f454653-fafe-4d96-8d4e-07ea4d0d6acf.png',
      'enabled', true,
      'isMozambique', true,
      'countryFlag', '🇲🇿',
      'countryName', 'Moçambique'
    ),
    -- Cartão MZ
    jsonb_build_object(
      'id', 'card_mz',
      'name', 'Pagamento com Cartão',
      'image', '/lovable-uploads/3253c01d-89da-4a32-846f-4861dd03645c.png',
      'enabled', true,
      'isMozambique', true,
      'countryFlag', '🇲🇿',
      'countryName', 'Moçambique'
    )
  )
)
WHERE payment_methods IS NOT NULL;