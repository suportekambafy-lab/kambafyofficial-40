-- Corrigir URLs antigos do Bunny CDN que estão na pasta errada
-- Atualizar de /ebooks/ para /identity-documents/

UPDATE identity_verification
SET 
  document_front_url = REPLACE(document_front_url, '/ebooks/', '/identity-documents/'),
  updated_at = NOW()
WHERE document_front_url LIKE '%kambafy.b-cdn.net/ebooks/%';

UPDATE identity_verification
SET 
  document_back_url = REPLACE(document_back_url, '/ebooks/', '/identity-documents/'),
  updated_at = NOW()
WHERE document_back_url LIKE '%kambafy.b-cdn.net/ebooks/%';