-- Reverter URLs de vídeo para iframe.mediadelivery.net/embed/
UPDATE lessons
SET bunny_embed_url = REPLACE(
  bunny_embed_url,
  'https://videos.kambafy.com/embed/',
  'https://iframe.mediadelivery.net/embed/'
)
WHERE bunny_embed_url IS NOT NULL
  AND bunny_embed_url LIKE 'https://videos.kambafy.com/embed/%';

UPDATE lessons
SET video_url = REPLACE(
  video_url,
  'https://videos.kambafy.com/embed/',
  'https://iframe.mediadelivery.net/embed/'
)
WHERE video_url IS NOT NULL
  AND video_url LIKE 'https://videos.kambafy.com/embed/%';