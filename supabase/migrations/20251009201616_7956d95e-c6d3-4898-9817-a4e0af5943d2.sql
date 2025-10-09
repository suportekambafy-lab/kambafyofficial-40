
-- Remover todas as políticas antigas de revision documents
DROP POLICY IF EXISTS "Sellers can upload revision documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can view revision documents" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can delete their revision documents" ON storage.objects;

-- Criar política simplificada que permite upload de documentos de revisão
-- O vendedor pode fazer upload desde que seja autenticado e o caminho comece com revision-documents
CREATE POLICY "Authenticated users can upload revision documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-files' 
  AND name LIKE 'revision-documents/%'
);

-- Permitir leitura pública dos documentos de revisão
CREATE POLICY "Anyone can view revision documents"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'product-files' 
  AND name LIKE 'revision-documents/%'
);

-- Permitir que vendedores deletem seus documentos
CREATE POLICY "Authenticated users can delete revision documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-files' 
  AND name LIKE 'revision-documents/%'
);
