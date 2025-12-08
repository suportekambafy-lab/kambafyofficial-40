-- ================================================
-- SECURITY FIX: Remove public read access to checkout_sessions
-- Keep only product owner access
-- ================================================

-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Allow all to read checkout_sessions" ON public.checkout_sessions;

-- The existing policies remain:
-- 1. "Sellers can view sessions for their products" - properly scoped to product owners
-- 2. "Anon can insert checkout sessions" - needed for checkout flow
-- 3. "Anyone can insert checkout sessions" - needed for checkout flow