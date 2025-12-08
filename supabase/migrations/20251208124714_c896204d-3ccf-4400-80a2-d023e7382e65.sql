-- ================================================
-- SECURITY FIX: Fix abandoned_purchases RLS policies
-- The current "Only service role can manage" policy is misleading
-- It uses USING (true) which allows everyone, not just service role
-- ================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Only service role can manage abandoned purchases" ON public.abandoned_purchases;

-- Keep existing policy: "Users can view abandoned purchases for their products"
-- This correctly restricts SELECT to product owners only

-- Add explicit policies for data modification (service role bypasses RLS anyway)
-- But we want to ensure no public INSERT/UPDATE/DELETE

-- Ensure RLS is enabled
ALTER TABLE public.abandoned_purchases ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner too (extra security)
ALTER TABLE public.abandoned_purchases FORCE ROW LEVEL SECURITY;