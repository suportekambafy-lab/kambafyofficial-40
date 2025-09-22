-- Fix Remaining Critical Data Exposure Issues
-- Fix member_area_sessions, sales_recovery_analytics, and order_bump_settings

-- ========================================
-- 1. Fix Member Area Sessions Data Exposure
-- ========================================
-- Drop all existing policies to start clean
DROP POLICY IF EXISTS "Students can view their own sessions" ON public.member_area_sessions;
DROP POLICY IF EXISTS "Authenticated students can view own sessions" ON public.member_area_sessions;
DROP POLICY IF EXISTS "System can manage member sessions" ON public.member_area_sessions;
DROP POLICY IF EXISTS "System can manage sessions" ON public.member_area_sessions;

-- Ensure RLS is enabled
ALTER TABLE public.member_area_sessions ENABLE ROW LEVEL SECURITY;

-- Create secure policy: ONLY authenticated students can access their own sessions
CREATE POLICY "Authenticated students access own sessions only" 
ON public.member_area_sessions 
FOR SELECT 
USING (
  -- Only valid authenticated sessions with matching email and not expired
  student_email = current_setting('app.current_student_email'::text, true) AND
  expires_at > now()
);

-- System policy for session management (edge functions only)
CREATE POLICY "System session management only" 
ON public.member_area_sessions 
FOR ALL 
USING (
  current_setting('role') = 'service_role' OR
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
)
WITH CHECK (
  current_setting('role') = 'service_role' OR
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- ========================================
-- 2. Fix Sales Recovery Analytics Exposure
-- ========================================
-- Drop all existing policies
DROP POLICY IF EXISTS "Owners can view their analytics" ON public.sales_recovery_analytics;
DROP POLICY IF EXISTS "Owners can manage their analytics" ON public.sales_recovery_analytics;
DROP POLICY IF EXISTS "System can manage analytics" ON public.sales_recovery_analytics;
DROP POLICY IF EXISTS "Business owners can view their own analytics only" ON public.sales_recovery_analytics;
DROP POLICY IF EXISTS "Business owners can manage their own analytics only" ON public.sales_recovery_analytics;

-- Ensure RLS is enabled
ALTER TABLE public.sales_recovery_analytics ENABLE ROW LEVEL SECURITY;

-- Create secure policy: ONLY authenticated business owners can access their analytics
CREATE POLICY "Authenticated owners access own analytics only" 
ON public.sales_recovery_analytics 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Create secure policy: ONLY authenticated owners can manage their analytics
CREATE POLICY "Authenticated owners manage own analytics only" 
ON public.sales_recovery_analytics 
FOR ALL 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- System policy for analytics management (edge functions only)
CREATE POLICY "System analytics management only" 
ON public.sales_recovery_analytics 
FOR ALL 
USING (
  current_setting('role') = 'service_role' OR
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
)
WITH CHECK (
  current_setting('role') = 'service_role' OR
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- ========================================
-- 3. Fix Order Bump Settings Exposure
-- ========================================
-- Drop all existing policies
DROP POLICY IF EXISTS "Public can view active order bumps for checkout" ON public.order_bump_settings;
DROP POLICY IF EXISTS "Users can delete their own order bump settings" ON public.order_bump_settings;
DROP POLICY IF EXISTS "Users can insert their own order bump settings" ON public.order_bump_settings;
DROP POLICY IF EXISTS "Users can update their own order bump settings" ON public.order_bump_settings;
DROP POLICY IF EXISTS "Users can view their own order bump settings" ON public.order_bump_settings;

-- Ensure RLS is enabled  
ALTER TABLE public.order_bump_settings ENABLE ROW LEVEL SECURITY;

-- Create secure policy: Public can ONLY view active bumps for valid products during checkout
CREATE POLICY "Public checkout access to active bumps only" 
ON public.order_bump_settings 
FOR SELECT 
USING (
  -- Only allow access if bump is enabled AND product exists and is active
  enabled = true AND
  EXISTS (
    SELECT 1 FROM public.products 
    WHERE id = order_bump_settings.product_id 
    AND status = 'Ativo'
  )
);

-- Create secure policy: ONLY authenticated owners can manage their settings
CREATE POLICY "Authenticated owners manage bump settings only" 
ON public.order_bump_settings 
FOR ALL 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);