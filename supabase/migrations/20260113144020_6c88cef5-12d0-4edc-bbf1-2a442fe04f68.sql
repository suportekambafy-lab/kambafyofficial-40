-- Recriar política INSERT com verificação mais detalhada
DROP POLICY IF EXISTS "Users can create their own application" ON public.referral_program_applications;

-- Política que permite INSERT quando auth.uid() corresponde ao user_id
CREATE POLICY "Users can create their own application" 
ON public.referral_program_applications 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Também garantir que authenticated role tem permissão
GRANT INSERT ON public.referral_program_applications TO authenticated;