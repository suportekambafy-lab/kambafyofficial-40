-- Criar políticas para acesso aos documentos de identidade
-- Admins podem visualizar todos os documentos
CREATE POLICY "Admins can view all identity documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'identity-documents' 
  AND EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE admin_users.email = get_current_user_email() 
      AND admin_users.is_active = true
  )
);

-- Usuários podem fazer upload dos seus próprios documentos
CREATE POLICY "Users can upload their own identity documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'identity-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Usuários podem visualizar seus próprios documentos
CREATE POLICY "Users can view their own identity documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'identity-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Usuários podem atualizar seus próprios documentos
CREATE POLICY "Users can update their own identity documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'identity-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Usuários podem deletar seus próprios documentos
CREATE POLICY "Users can delete their own identity documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'identity-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);