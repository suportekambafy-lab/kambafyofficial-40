-- Fix critical security issue: Make profiles table secure
-- Remove any overly permissive policies and implement proper access control

-- First, let's see what policies currently exist on profiles
-- This is a security-critical fix for the profiles table

-- Drop any existing overly permissive policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are publicly readable" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;

-- Create secure policies that only allow users to access their own data
CREATE POLICY "Users can view own profile only" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile only" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile only" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile only" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Also fix the infinite recursion issue in admin_users by creating a security definer function
-- Drop the problematic policies first
DROP POLICY IF EXISTS "Admin users can manage admin accounts" ON public.admin_users;
DROP POLICY IF EXISTS "Admin users can view admin data" ON public.admin_users;

-- Create a security definer function to check admin status safely
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users au
    WHERE au.email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
    AND au.is_active = true
  );
$$;

-- Create new admin policies using the security definer function
CREATE POLICY "Admin users can view admin data" 
ON public.admin_users 
FOR SELECT 
USING (public.is_current_user_admin());

CREATE POLICY "Admin users can manage admin accounts" 
ON public.admin_users 
FOR ALL 
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());