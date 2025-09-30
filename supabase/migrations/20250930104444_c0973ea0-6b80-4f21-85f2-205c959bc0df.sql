-- Atualizar também o campo video_url das aulas existentes
UPDATE lessons 
SET video_url = REPLACE(
  video_url,
  'https://iframe.mediadelivery.net/embed/',
  'https://videos.kambafy.com/embed/'
)
WHERE video_url IS NOT NULL 
  AND video_url LIKE 'https://iframe.mediadelivery.net/embed/%';