-- Deletar verificações antigas sem documentos
-- Isso permitirá que os usuários façam novo upload completo

DELETE FROM identity_verification
WHERE 
  (document_front_url IS NULL OR document_back_url IS NULL)
  AND status = 'pendente';