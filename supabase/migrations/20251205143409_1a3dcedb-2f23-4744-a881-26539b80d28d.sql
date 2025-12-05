-- Drop the restrictive policy
DROP POLICY IF EXISTS "Anyone can insert checkout sessions" ON checkout_sessions;

-- Create a proper PERMISSIVE policy for anonymous inserts
CREATE POLICY "Anyone can insert checkout sessions"
ON checkout_sessions
FOR INSERT
TO public
WITH CHECK (true);

-- Also allow anon role explicitly
CREATE POLICY "Anon can insert checkout sessions"
ON checkout_sessions
FOR INSERT
TO anon
WITH CHECK (true);