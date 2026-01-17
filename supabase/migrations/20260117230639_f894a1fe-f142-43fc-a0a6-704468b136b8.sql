-- Fix member_area_sessions security: remove public read access
-- This table contains sensitive session data (tokens, IPs, emails) that should not be publicly readable

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public can view active sessions" ON public.member_area_sessions;

-- Drop the overly permissive public DELETE policy  
DROP POLICY IF EXISTS "Public can delete expired sessions" ON public.member_area_sessions;

-- Drop the overly permissive public INSERT policy
DROP POLICY IF EXISTS "Public can create sessions for login" ON public.member_area_sessions;

-- Revoke anonymous access completely
REVOKE ALL ON public.member_area_sessions FROM anon;

-- Keep the existing policies for:
-- 1. "Authenticated students access own sessions only" - uses app.current_student_email setting
-- 2. "System session management only" - for service_role
-- 3. "Validation email can create sessions anywhere" - for validar@kambafy.com

-- Note: Session creation/management should happen through edge functions using service_role,
-- not through direct public access. The edge function member-area-verify already does this correctly.