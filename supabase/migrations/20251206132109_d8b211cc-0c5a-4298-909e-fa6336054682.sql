-- Atualizar métodos UK para incluir imagens
-- Primeiro remover os métodos UK antigos e adicionar novamente com imagens

UPDATE products
SET payment_methods = (
  SELECT jsonb_agg(
    CASE 
      WHEN elem->>'id' = 'card_uk' THEN 
        elem || '{"image": "/lovable-uploads/3253c01d-89da-4a32-846f-4861dd03645c.png"}'::jsonb
      WHEN elem->>'id' = 'klarna_uk' THEN 
        elem || '{"image": "/lovable-uploads/86f49c10-3542-43ce-89aa-cbef30d98480.png"}'::jsonb
      ELSE elem
    END
  )
  FROM jsonb_array_elements(payment_methods) elem
)
WHERE payment_methods @> '[{"id": "card_uk"}]'::jsonb;