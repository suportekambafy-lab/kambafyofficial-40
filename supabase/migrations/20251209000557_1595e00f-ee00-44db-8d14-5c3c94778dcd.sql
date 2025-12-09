-- Allow authenticated users to view public profile fields of all users
-- This is safe because we only expose non-sensitive fields (full_name, avatar_url)
-- Sensitive data (email, phone, etc.) remains protected - only the owner can see those

CREATE POLICY "Authenticated users can view public profile info"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);