-- Corrigir políticas para permitir visualizações necessárias

-- 1. Permitir que TODOS vejam produtos que permitem afiliação (para Kamba Extra)
DROP POLICY IF EXISTS "Public can view products for checkout" ON public.products;

CREATE POLICY "Public can view active products that allow affiliates" 
ON public.products 
FOR SELECT 
USING (
  status = 'Ativo' AND allow_affiliates = true
);

-- 2. Manter política para vendedores verem seus próprios produtos
CREATE POLICY "Users can view their own products" 
ON public.products 
FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Permitir que vendedores vejam afiliados dos seus produtos
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

-- 4. Manter política para afiliados verem suas próprias relações
-- (Esta já existe e está funcionando)

-- 5. Permitir checkout público com produtos específicos
CREATE POLICY "Public can view products for checkout by ID" 
ON public.products 
FOR SELECT 
USING (true);  -- Permitir acesso para checkout de qualquer produto

-- 6. Corrigir política de admins para produtos
CREATE POLICY "Admins can view all products" 
ON public.products 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE email = get_current_user_email() 
    AND is_active = true
  )
);