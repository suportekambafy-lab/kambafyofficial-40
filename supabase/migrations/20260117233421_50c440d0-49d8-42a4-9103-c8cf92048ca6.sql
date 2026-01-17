-- ============================================
-- FIX 1: abandoned_purchases table security
-- Issue: Overly permissive UPDATE policy and potential anon access
-- ============================================

-- Drop the overly permissive UPDATE policy
DROP POLICY IF EXISTS "Allow marking abandonments as recovered" ON public.abandoned_purchases;

-- Create a proper UPDATE policy - only product owners can update their abandoned purchases
CREATE POLICY "Product owners can update their abandoned purchases"
ON public.abandoned_purchases
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM products p
    WHERE p.id = abandoned_purchases.product_id
    AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM products p
    WHERE p.id = abandoned_purchases.product_id
    AND p.user_id = auth.uid()
  )
);

-- Revoke anon access to prevent public reads
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.abandoned_purchases FROM anon;

-- ============================================
-- FIX 2: admin_action_logs table security
-- Issue: SELECT policy on public role could expose data
-- ============================================

-- Drop the overly permissive policy targeting public role
DROP POLICY IF EXISTS "Active admins can view action logs" ON public.admin_action_logs;

-- Keep only the authenticated policy (which is correct)
-- But ensure we have proper INSERT for edge functions
DROP POLICY IF EXISTS "System can insert logs" ON public.admin_action_logs;

CREATE POLICY "Service role can insert logs"
ON public.admin_action_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Revoke anon access completely
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.admin_action_logs FROM anon;