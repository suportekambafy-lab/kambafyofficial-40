
-- Remover política antiga
DROP POLICY IF EXISTS "Sellers can upload revision documents" ON storage.objects;

-- Criar política corrigida para upload de documentos de revisão
CREATE POLICY "Sellers can upload revision documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-files' 
  AND (storage.foldername(name))[1] = 'revision-documents'
  AND EXISTS (
    SELECT 1 FROM products 
    WHERE id = ((storage.foldername(name))[2])::uuid
    AND user_id = auth.uid()
  )
);
