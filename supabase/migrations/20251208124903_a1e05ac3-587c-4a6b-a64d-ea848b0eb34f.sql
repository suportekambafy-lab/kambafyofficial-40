-- ================================================
-- SECURITY FIX: Remove public read access to lesson_comments
-- The "Students can view comments on accessible lessons" policy uses USING (true)
-- which makes all comments publicly readable
-- ================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Students can view comments on accessible lessons" ON public.lesson_comments;

-- The remaining policies properly restrict access:
-- 1. "Area owners can manage all comments in their area" - for course creators
-- 2. "Students can view comments on lessons they have access to" - properly scoped
-- 3. Other insert/update/delete policies are also properly scoped