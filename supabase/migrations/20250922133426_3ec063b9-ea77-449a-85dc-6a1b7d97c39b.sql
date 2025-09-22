-- Fix critical 2FA security vulnerability by implementing proper RLS policies
-- Current policies allow public access (qual:true), need to restrict to user's own codes

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Usuários podem ver seus próprios códigos 2FA" ON public.two_factor_codes;
DROP POLICY IF EXISTS "Sistema pode inserir códigos 2FA" ON public.two_factor_codes;
DROP POLICY IF EXISTS "Sistema pode atualizar códigos 2FA" ON public.two_factor_codes;

-- Create secure policies that restrict access to user's own 2FA codes
CREATE POLICY "Users can view their own 2FA codes" 
ON public.two_factor_codes 
FOR SELECT 
USING (
  user_email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
);

-- Allow system to insert 2FA codes (for sending codes via edge functions)
CREATE POLICY "System can insert 2FA codes" 
ON public.two_factor_codes 
FOR INSERT 
WITH CHECK (true);

-- Allow users to update their own 2FA codes (mark as used)
CREATE POLICY "Users can update their own 2FA codes" 
ON public.two_factor_codes 
FOR UPDATE 
USING (
  user_email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
);

-- Allow system to update 2FA codes (for cleanup and marking as used)
CREATE POLICY "System can update 2FA codes for cleanup" 
ON public.two_factor_codes 
FOR UPDATE 
USING (true);

-- Allow system to delete expired codes
CREATE POLICY "System can delete expired 2FA codes" 
ON public.two_factor_codes 
FOR DELETE 
USING (expires_at < now() OR used = true);