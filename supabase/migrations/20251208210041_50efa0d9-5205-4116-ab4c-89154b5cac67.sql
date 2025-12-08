-- Criar política para permitir que usuários atualizem apenas campos de endereço mesmo quando verificados
CREATE POLICY "Users can update their own address fields" 
ON public.identity_verification 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);