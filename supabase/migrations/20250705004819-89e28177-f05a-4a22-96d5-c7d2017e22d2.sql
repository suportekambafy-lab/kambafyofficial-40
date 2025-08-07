-- Fix permission denied error for auth.users table access in RLS policies

-- Create a security definer function to get current user email
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop and recreate the policy that was causing the issue
DROP POLICY IF EXISTS "Users can view relevant orders" ON public.orders;

-- Create new policy using the security definer function
CREATE POLICY "Users can view relevant orders" 
ON public.orders 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  public.get_current_user_email() = customer_email
);