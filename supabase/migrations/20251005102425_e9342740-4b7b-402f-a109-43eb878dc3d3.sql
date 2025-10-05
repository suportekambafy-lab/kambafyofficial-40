-- Criar função para corrigir URLs do Bunny CDN que estão sem protocolo
CREATE OR REPLACE FUNCTION fix_bunny_cdn_urls()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualizar share_link em products
  UPDATE products 
  SET share_link = 'https://' || share_link 
  WHERE share_link IS NOT NULL
    AND share_link != ''
    AND NOT share_link LIKE 'http%'
    AND (
      share_link LIKE '%.b-cdn.net%' 
      OR share_link LIKE 'bunnycdn.net%'
      OR share_link LIKE 'kambafy.b-cdn.net%'
    );
    
  RAISE NOTICE 'URLs do Bunny CDN corrigidas com sucesso';
END;
$$;

-- Executar a correção
SELECT fix_bunny_cdn_urls();

-- A função pode ser removida após a execução, mas vamos mantê-la para futuros ajustes se necessário
