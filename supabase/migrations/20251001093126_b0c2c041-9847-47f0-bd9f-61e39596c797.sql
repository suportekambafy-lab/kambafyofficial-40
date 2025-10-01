-- Atualizar todos os vídeos existentes que usam videos.kambafy.com para iframe.mediadelivery.net
UPDATE lessons
SET video_url = REPLACE(video_url, 'https://videos.kambafy.com/embed/', 'https://iframe.mediadelivery.net/embed/')
WHERE video_url LIKE 'https://videos.kambafy.com/embed/%';

-- Atualizar bunny_embed_url também se existir
UPDATE lessons
SET bunny_embed_url = REPLACE(bunny_embed_url, 'https://videos.kambafy.com/embed/', 'https://iframe.mediadelivery.net/embed/')
WHERE bunny_embed_url LIKE 'https://videos.kambafy.com/embed/%';