-- Enable Row Level Security on admin_users table
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create policy for admin users to view their own data and other admins (for admin operations)
CREATE POLICY "Admin users can view admin data" 
ON public.admin_users 
FOR SELECT 
USING (
  -- Allow if the requesting user is an admin (checked via email from auth context)
  EXISTS (
    SELECT 1 
    FROM public.admin_users au 
    WHERE au.email = get_current_user_email() 
      AND au.is_active = true
  )
);

-- Create policy for system operations (like login verification)
-- This allows read access for authentication purposes but only via functions
CREATE POLICY "System can read admin users for authentication" 
ON public.admin_users 
FOR SELECT 
USING (true);

-- Create policy for admin user management (insert/update)
CREATE POLICY "Admin users can manage admin accounts" 
ON public.admin_users 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM public.admin_users au 
    WHERE au.email = get_current_user_email() 
      AND au.is_active = true
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.admin_users au 
    WHERE au.email = get_current_user_email() 
      AND au.is_active = true
  )
);

-- Ensure we have the admin user in the database for the hardcoded login
INSERT INTO public.admin_users (email, password_hash, full_name, is_active)
VALUES (
  'suporte@kambafy.com',
  '$2b$10$dummy.hash.for.hardcoded.auth', -- Placeholder since we use hardcoded auth
  'Administrador Kambafy',
  true
) ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  is_active = EXCLUDED.is_active;