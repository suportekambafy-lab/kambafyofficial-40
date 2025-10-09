-- Drop ALL existing policies for identity-documents bucket
DROP POLICY IF EXISTS "Admins can upload identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow test uploads in test folders" ON storage.objects;

-- Create test folder policy (allows uploads without authentication)
CREATE POLICY "Allow test uploads in test folders"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'identity-documents' AND
  (name LIKE 'test-%' OR name LIKE 'admin-test-%')
);

-- ========== USER POLICIES ==========

-- Users can upload their own identity documents
CREATE POLICY "Users can upload their own identity documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'identity-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own identity documents
CREATE POLICY "Users can view their own identity documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own identity documents
CREATE POLICY "Users can update their own identity documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'identity-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own identity documents
CREATE POLICY "Users can delete their own identity documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'identity-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ========== ADMIN POLICIES ==========

-- Admins can upload identity documents
CREATE POLICY "Admins can upload identity documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'identity-documents' AND
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = get_current_user_email()
    AND is_active = true
  )
);

-- Admins can view all identity documents
CREATE POLICY "Admins can view all identity documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-documents' AND
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = get_current_user_email()
    AND is_active = true
  )
);

-- Admins can update identity documents
CREATE POLICY "Admins can update identity documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'identity-documents' AND
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = get_current_user_email()
    AND is_active = true
  )
);

-- Admins can delete identity documents
CREATE POLICY "Admins can delete identity documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'identity-documents' AND
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = get_current_user_email()
    AND is_active = true
  )
);