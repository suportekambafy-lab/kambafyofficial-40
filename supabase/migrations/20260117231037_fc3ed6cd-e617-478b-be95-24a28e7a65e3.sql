-- Fix kambapay_registrations RLS: remove overly permissive policy
-- The current policy allows ANY authenticated user to view ALL registrations due to "email IS NOT NULL" condition

-- Drop the flawed SELECT policy
DROP POLICY IF EXISTS "Users can view their own registration" ON public.kambapay_registrations;

-- Create proper restrictive SELECT policy for users (own registration only)
CREATE POLICY "Users can view their own registration"
ON public.kambapay_registrations FOR SELECT
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Create admin access policy
CREATE POLICY "Admins can view all registrations"
ON public.kambapay_registrations FOR SELECT
TO authenticated
USING (is_authenticated_admin());

-- Revoke anonymous SELECT access (INSERT still allowed for registration)
REVOKE SELECT ON public.kambapay_registrations FROM anon;