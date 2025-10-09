-- Criar políticas RLS para permitir admins acessarem documentos de identidade

-- Política para admins lerem/visualizarem documentos
CREATE POLICY "Admins can view identity documents"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'identity-documents' 
  AND (
    -- Permitir para admins verificados
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE email = get_current_user_email() 
      AND is_active = true
    )
    -- OU permitir para o dono do arquivo
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Política para usuários fazerem upload dos seus próprios documentos
CREATE POLICY "Users can upload their identity documents"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'identity-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para usuários atualizarem seus próprios documentos
CREATE POLICY "Users can update their identity documents"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'identity-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);