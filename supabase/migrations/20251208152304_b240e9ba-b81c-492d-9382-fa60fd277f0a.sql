-- Fix PUBLIC_DATA_EXPOSURE: Remove overly permissive RLS policy that exposes 2,043+ student emails
-- The member-area-login edge function uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS,
-- so this public policy is unnecessary and creates a security vulnerability

DROP POLICY IF EXISTS "Allow public email verification for member login" ON public.member_area_students;