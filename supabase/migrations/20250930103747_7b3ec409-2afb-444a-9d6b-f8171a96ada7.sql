-- Migrar URLs antigas do Bunny.net para usar o domínio personalizado videos.kambafy.com
-- Atualizar bunny_embed_url na tabela lessons

UPDATE lessons 
SET bunny_embed_url = REPLACE(
  bunny_embed_url,
  'https://iframe.mediadelivery.net/embed/',
  'https://videos.kambafy.com/embed/'
)
WHERE bunny_embed_url IS NOT NULL 
  AND bunny_embed_url LIKE 'https://iframe.mediadelivery.net/embed/%';

-- Adicionar comentário para documentação
COMMENT ON COLUMN lessons.bunny_embed_url IS 'URL de embed do Bunny.net usando domínio personalizado videos.kambafy.com';