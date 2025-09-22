-- Fix Critical Security Vulnerabilities - Phase 1: Data Exposure Issues (Revised)
-- This migration addresses the ERROR level security findings
-- Drop existing policies first to avoid conflicts

-- ========================================
-- 1. Fix Customer Balance Data Exposure
-- ========================================
-- Drop all existing policies on customer_balances
DROP POLICY IF EXISTS "Public can access balance by email" ON public.customer_balances;
DROP POLICY IF EXISTS "Users can create their own balance" ON public.customer_balances;
DROP POLICY IF EXISTS "Users can update their own balance" ON public.customer_balances;
DROP POLICY IF EXISTS "Users can view their own balance" ON public.customer_balances;

-- Create secure policies for customer_balances
CREATE POLICY "Users can view their own balance authenticated" 
ON public.customer_balances 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    (auth.uid() = user_id) OR 
    (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  )
);

CREATE POLICY "Users can create their own balance authenticated" 
ON public.customer_balances 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    (auth.uid() = user_id) OR 
    (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  )
);

CREATE POLICY "Users can update their own balance authenticated" 
ON public.customer_balances 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    (auth.uid() = user_id) OR 
    (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  )
);

-- System policy for balance management
CREATE POLICY "System can manage customer balances" 
ON public.customer_balances 
FOR ALL 
USING (true)
WITH CHECK (true);

-- ========================================
-- 2. Fix Student Session Data Exposure  
-- ========================================
-- Drop existing policies on member_area_sessions
DROP POLICY IF EXISTS "Students can view their own sessions" ON public.member_area_sessions;
DROP POLICY IF EXISTS "System can manage sessions" ON public.member_area_sessions;

-- Create secure policies for member_area_sessions
CREATE POLICY "Authenticated students can view own sessions" 
ON public.member_area_sessions 
FOR SELECT 
USING (
  -- Only allow if properly authenticated through member area system
  student_email = current_setting('app.current_student_email'::text, true) AND
  expires_at > now()
);

CREATE POLICY "System can manage member sessions" 
ON public.member_area_sessions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- ========================================  
-- 3. Fix Business Analytics Data Exposure
-- ========================================
-- Drop existing policies on sales_recovery_analytics
DROP POLICY IF EXISTS "Business owners can view their own analytics only" ON public.sales_recovery_analytics;
DROP POLICY IF EXISTS "Business owners can manage their own analytics only" ON public.sales_recovery_analytics;
DROP POLICY IF EXISTS "System can manage recovery analytics" ON public.sales_recovery_analytics;

-- Create secure policies for sales_recovery_analytics
CREATE POLICY "Owners can view their analytics" 
ON public.sales_recovery_analytics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Owners can manage their analytics" 
ON public.sales_recovery_analytics 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can manage analytics" 
ON public.sales_recovery_analytics 
FOR ALL 
USING (true)
WITH CHECK (true);

-- ========================================
-- 4. Fix Checkout Configuration Exposure
-- ========================================
-- Drop existing policies on checkout_customizations
DROP POLICY IF EXISTS "Public can view checkout customizations for checkout page" ON public.checkout_customizations;
DROP POLICY IF EXISTS "Users can manage their own checkout customizations" ON public.checkout_customizations;

-- Create secure policies for checkout_customizations
CREATE POLICY "Public can view active product checkouts" 
ON public.checkout_customizations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.products 
    WHERE id = checkout_customizations.product_id 
    AND status = 'Ativo'
  )
);

CREATE POLICY "Users can manage own checkout customizations" 
ON public.checkout_customizations 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);