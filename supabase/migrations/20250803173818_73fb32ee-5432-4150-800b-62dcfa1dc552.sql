-- Verificar e corrigir políticas de afiliados
-- Garantir que vendedores possam ver afiliados dos seus produtos

-- Política principal: vendedores veem afiliados dos seus produtos
DROP POLICY IF EXISTS "Product owners can view affiliates for their products" ON public.affiliates;

CREATE POLICY "Product owners can view affiliates for their products" 
ON public.affiliates 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = affiliates.product_id 
    AND products.user_id = auth.uid()
  )
);

-- Política para afiliados verem suas próprias relações (já existe mas vamos garantir)
DROP POLICY IF EXISTS "Affiliates can view their own affiliate relations" ON public.affiliates;

CREATE POLICY "Affiliates can view their own affiliate relations" 
ON public.affiliates 
FOR SELECT 
USING (auth.uid() = affiliate_user_id);

-- Política para vendedores gerenciarem (aprovar/rejeitar) afiliados
DROP POLICY IF EXISTS "Product owners can manage their affiliate requests" ON public.affiliates;

CREATE POLICY "Product owners can manage their affiliate requests" 
ON public.affiliates 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = affiliates.product_id 
    AND products.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = affiliates.product_id 
    AND products.user_id = auth.uid()
  )
);