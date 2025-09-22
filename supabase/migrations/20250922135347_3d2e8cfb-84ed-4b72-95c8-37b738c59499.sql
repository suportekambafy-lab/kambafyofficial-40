-- Check and Fix Customer Balances Security - Emergency Fix
-- The table is still showing as publicly accessible despite previous policies

-- First, let's see what policies currently exist and drop ALL policies to start clean
-- This ensures no conflicting policies are causing the security issue

-- Drop ALL existing policies on customer_balances to avoid conflicts
DROP POLICY IF EXISTS "Public can access balance by email" ON public.customer_balances;
DROP POLICY IF EXISTS "Users can create their own balance" ON public.customer_balances;  
DROP POLICY IF EXISTS "Users can update their own balance" ON public.customer_balances;
DROP POLICY IF EXISTS "Users can view their own balance" ON public.customer_balances;
DROP POLICY IF EXISTS "Users can view their own balance authenticated" ON public.customer_balances;
DROP POLICY IF EXISTS "Users can create their own balance authenticated" ON public.customer_balances;
DROP POLICY IF EXISTS "Users can update their own balance authenticated" ON public.customer_balances;
DROP POLICY IF EXISTS "System can manage customer balances" ON public.customer_balances;
DROP POLICY IF EXISTS "Users can view their own balance only" ON public.customer_balances;
DROP POLICY IF EXISTS "Users can update their own balance only" ON public.customer_balances;

-- Ensure RLS is enabled
ALTER TABLE public.customer_balances ENABLE ROW LEVEL SECURITY;

-- Create a single, secure policy for SELECT access - NO PUBLIC ACCESS
CREATE POLICY "Authenticated users can view own balance data only" 
ON public.customer_balances 
FOR SELECT 
USING (
  -- Only authenticated users can access their own balance data
  auth.uid() IS NOT NULL AND (
    -- Match by user_id (primary method)
    auth.uid() = user_id OR 
    -- OR match by email for backwards compatibility
    (user_id IS NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  )
);

-- Create secure INSERT policy - authenticated users only
CREATE POLICY "Authenticated users can create own balance only" 
ON public.customer_balances 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR 
    (user_id IS NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  )
);

-- Create secure UPDATE policy - authenticated users only  
CREATE POLICY "Authenticated users can update own balance only" 
ON public.customer_balances 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR 
    (user_id IS NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  )
);

-- NO DELETE policy - balances should not be deleted by users

-- Create system policy ONLY for edge functions and system operations
CREATE POLICY "System operations for balance management" 
ON public.customer_balances 
FOR ALL 
USING (
  -- This allows system operations but requires special context
  -- Only works when called from edge functions or system context
  current_setting('role') = 'service_role' OR
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
)
WITH CHECK (
  current_setting('role') = 'service_role' OR
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);