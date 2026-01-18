-- Fix RLS policies on products table to use is_authenticated_admin() function
-- This prevents "permission denied for table admin_users" errors for regular users

-- First, drop the problematic policies that query admin_users directly
DROP POLICY IF EXISTS "Admins can view all products" ON public.products;
DROP POLICY IF EXISTS "Admins can update all products" ON public.products;

-- Recreate policies using the SECURITY DEFINER function
CREATE POLICY "Admins can view all products" 
ON public.products 
FOR SELECT 
USING (
  public.is_authenticated_admin()
);

CREATE POLICY "Admins can update all products" 
ON public.products 
FOR UPDATE 
USING (
  public.is_authenticated_admin()
);