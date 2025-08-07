-- Adicionar política para afiliados ativos verem produtos que podem promover
CREATE POLICY "Affiliates can view products they can promote" 
ON public.products 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.affiliates 
    WHERE affiliates.product_id = products.id 
    AND affiliates.affiliate_user_id = auth.uid() 
    AND affiliates.status = 'ativo'
  )
);