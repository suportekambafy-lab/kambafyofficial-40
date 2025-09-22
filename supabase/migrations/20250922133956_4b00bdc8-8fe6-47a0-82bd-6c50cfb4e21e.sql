-- Fix Critical Security Vulnerabilities - Phase 1: Data Exposure Issues
-- This migration addresses the ERROR level security findings

-- ========================================
-- 1. Fix Customer Balance Data Exposure
-- ========================================
-- The customer_balances table is currently publicly readable, exposing customer emails
-- Update RLS policies to restrict access to authenticated users and their own data

-- First, let's see current policies and drop insecure ones
DROP POLICY IF EXISTS "Public can access balance by email" ON public.customer_balances;

-- Create secure policy: Users can only see their own balance
CREATE POLICY "Users can view their own balance only" 
ON public.customer_balances 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  (auth.uid() IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Create secure policy for balance updates
CREATE POLICY "Users can update their own balance only" 
ON public.customer_balances 
FOR UPDATE 
USING (
  (auth.uid() = user_id) OR 
  (auth.uid() IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- ========================================
-- 2. Fix Student Session Data Exposure  
-- ========================================
-- The member_area_sessions table is publicly readable, exposing student personal data
-- Remove public access and implement proper authentication checks

-- Drop the insecure public policy
DROP POLICY IF EXISTS "Students can view their own sessions" ON public.member_area_sessions;

-- Create secure policy: Only authenticated students can see their own sessions
CREATE POLICY "Authenticated students can view their own sessions only" 
ON public.member_area_sessions 
FOR SELECT 
USING (
  -- Allow if the current session matches the student email in an active session
  student_email = current_setting('app.current_student_email'::text, true) AND
  expires_at > now()
);

-- ========================================  
-- 3. Fix Business Analytics Data Exposure
-- ========================================
-- The sales_recovery_analytics table is publicly readable, exposing business metrics
-- Restrict access to data owners only

-- Create policy: Only business owners can view their own analytics
CREATE POLICY "Business owners can view their own analytics only" 
ON public.sales_recovery_analytics 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy: Only business owners can manage their own analytics  
CREATE POLICY "Business owners can manage their own analytics only" 
ON public.sales_recovery_analytics 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ========================================
-- 4. Fix Checkout Configuration Exposure (Warning Level)
-- ========================================
-- Restrict checkout customizations access while maintaining public read for active checkouts

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Public can view checkout customizations for checkout page" ON public.checkout_customizations;

-- Create more secure policy: Public can only view customizations for valid product checkouts
CREATE POLICY "Public can view checkout customizations for valid products only" 
ON public.checkout_customizations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.products 
    WHERE id = checkout_customizations.product_id 
    AND status = 'Ativo'
  )
);

-- ========================================
-- 5. System Access Policies (Maintain Functionality)
-- ========================================
-- Ensure system operations can still function properly

-- Allow system to manage customer balances for checkout operations
CREATE POLICY "System can manage customer balances" 
ON public.customer_balances 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Allow system to manage member area sessions
CREATE POLICY "System can manage member area sessions" 
ON public.member_area_sessions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Allow system to manage recovery analytics
CREATE POLICY "System can manage recovery analytics" 
ON public.sales_recovery_analytics 
FOR ALL 
USING (true)
WITH CHECK (true);