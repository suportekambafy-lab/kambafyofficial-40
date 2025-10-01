-- Adicionar campo hls_url na tabela lessons
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS hls_url text;

-- Extrair video IDs das URLs existentes e gerar URLs HLS
-- Formato: https://iframe.mediadelivery.net/embed/{library-id}/{video-id}
-- Para: https://vz-5c879716-268.b-cdn.net/{video-id}/playlist.m3u8

UPDATE lessons
SET hls_url = CONCAT(
  'https://vz-5c879716-268.b-cdn.net/',
  SUBSTRING(
    COALESCE(bunny_embed_url, video_url),
    '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}'
  ),
  '/playlist.m3u8'
)
WHERE (bunny_embed_url IS NOT NULL OR video_url IS NOT NULL)
  AND (bunny_embed_url LIKE '%iframe.mediadelivery.net%' OR video_url LIKE '%iframe.mediadelivery.net%')
  AND hls_url IS NULL;