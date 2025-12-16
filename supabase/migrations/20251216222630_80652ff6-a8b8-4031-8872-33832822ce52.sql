
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public can view active sales recovery settings for checkout" ON public.sales_recovery_settings;

-- Create a more restrictive policy for checkout - only check if product has recovery enabled
-- This allows the checkout page to verify recovery is enabled for a specific product
CREATE POLICY "Checkout can check if recovery enabled for product" 
ON public.sales_recovery_settings 
FOR SELECT 
USING (
  -- Either the user owns the settings OR we're just checking enabled status for a specific product
  auth.uid() = user_id OR enabled = true
);

-- Actually, let's be even more restrictive. Let's keep only the owner policy and create a function for checkout
DROP POLICY IF EXISTS "Checkout can check if recovery enabled for product" ON public.sales_recovery_settings;

-- Simple policy: only owners can see their settings
-- We already have "Users can manage their own recovery settings" which handles this

-- For checkout, we'll use a security definer function instead
CREATE OR REPLACE FUNCTION public.is_cart_recovery_enabled(p_product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sales_recovery_settings
    WHERE product_id = p_product_id
      AND enabled = true
  )
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_cart_recovery_enabled(uuid) TO public;
GRANT EXECUTE ON FUNCTION public.is_cart_recovery_enabled(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_cart_recovery_enabled(uuid) TO anon;
