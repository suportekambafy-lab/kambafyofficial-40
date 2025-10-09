-- Drop ALL existing policies for identity-documents bucket
DROP POLICY IF EXISTS "Admins can upload identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow test uploads in test folders" ON storage.objects;

-- Create new test folder policy (allows uploads without authentication)
CREATE POLICY "Allow test uploads in test folders"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'identity-documents' AND
  (name LIKE 'test-%' OR name LIKE 'admin-test-%')
);

-- Create authenticated user policies
CREATE POLICY "Users can upload their own identity documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'identity-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own identity documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'identity-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);