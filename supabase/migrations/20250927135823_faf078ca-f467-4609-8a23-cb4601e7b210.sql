-- Criar políticas RLS para o bucket member-area-assets
-- Permitir que usuários autenticados façam upload de materiais de aula

-- Política para permitir que usuários autenticados façam upload
CREATE POLICY "Authenticated users can upload lesson materials" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'member-area-assets' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'lesson-materials'
);

-- Política para permitir que usuários vejam seus próprios uploads
CREATE POLICY "Users can view lesson materials" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'member-area-assets'
  AND (storage.foldername(name))[1] = 'lesson-materials'
);

-- Política para permitir que usuários deletem seus próprios arquivos
CREATE POLICY "Users can delete their own lesson materials" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'member-area-assets' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'lesson-materials'
);

-- Política para permitir que usuários atualizem seus próprios arquivos
CREATE POLICY "Users can update their own lesson materials" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'member-area-assets' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'lesson-materials'
);