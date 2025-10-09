-- Limpar URLs antigas do Supabase Storage que não existem mais
-- Isso permitirá que os usuários façam novo upload usando Bunny CDN

UPDATE identity_verification
SET 
  document_front_url = NULL,
  document_back_url = NULL,
  status = 'pendente',
  updated_at = NOW()
WHERE 
  (document_front_url LIKE '%supabase.co/storage%' 
   OR document_back_url LIKE '%supabase.co/storage%')
  AND status != 'aprovado';