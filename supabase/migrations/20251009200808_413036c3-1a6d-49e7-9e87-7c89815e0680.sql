
-- Criar bucket para documentos de revisão se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-files', 'product-files', true)
ON CONFLICT (id) DO NOTHING;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Sellers can upload revision documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can view revision documents" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can delete their revision documents" ON storage.objects;

-- Criar políticas de storage para documentos de revisão
CREATE POLICY "Sellers can upload revision documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-files' 
  AND (storage.foldername(name))[1] = 'revision-documents'
  AND EXISTS (
    SELECT 1 FROM products 
    WHERE id::text = (storage.foldername(name))[2]
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Public can view revision documents"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-files' AND (storage.foldername(name))[1] = 'revision-documents');

CREATE POLICY "Sellers can delete their revision documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-files' 
  AND (storage.foldername(name))[1] = 'revision-documents'
  AND EXISTS (
    SELECT 1 FROM products 
    WHERE id::text = (storage.foldername(name))[2]
    AND user_id = auth.uid()
  )
);
