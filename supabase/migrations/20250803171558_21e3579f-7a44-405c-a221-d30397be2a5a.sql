-- Adicionar política para afiliados verem suas próprias relações de afiliação
CREATE POLICY "Affiliates can view their own affiliate relations" 
ON public.affiliates 
FOR SELECT 
USING (auth.uid() = affiliate_user_id);