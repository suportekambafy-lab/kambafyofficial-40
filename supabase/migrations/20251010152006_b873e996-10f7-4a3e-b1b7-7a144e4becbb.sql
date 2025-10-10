-- Criar bucket para arquivos de produtos (ebooks, etc)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-files', 'product-files', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir que todos vejam os arquivos (já que são produtos públicos após compra)
CREATE POLICY "Public can view product files"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-files');

-- Política para permitir que vendedores façam upload dos seus arquivos
CREATE POLICY "Sellers can upload their product files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-files' AND
  auth.uid() IS NOT NULL
);

-- Política para permitir que vendedores atualizem seus arquivos
CREATE POLICY "Sellers can update their product files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-files' AND
  auth.uid() IS NOT NULL
);

-- Política para permitir que vendedores deletem seus arquivos
CREATE POLICY "Sellers can delete their product files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-files' AND
  auth.uid() IS NOT NULL
);