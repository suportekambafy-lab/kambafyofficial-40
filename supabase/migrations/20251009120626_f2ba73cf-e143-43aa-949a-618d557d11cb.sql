-- Adicionar política para permitir admins fazerem upload de documentos KYC
CREATE POLICY "Admins can upload identity documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'identity-documents' AND
  EXISTS (
    SELECT 1 
    FROM public.admin_users 
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND is_active = true
  )
);

-- Adicionar política para permitir admins atualizarem documentos KYC
CREATE POLICY "Admins can update identity documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'identity-documents' AND
  EXISTS (
    SELECT 1 
    FROM public.admin_users 
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND is_active = true
  )
);