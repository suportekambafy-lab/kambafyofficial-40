-- Primeiro, limpar todas as políticas de products e recriar do zero
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
DROP POLICY IF EXISTS "Public can view active products that allow affiliates" ON public.products; 
DROP POLICY IF EXISTS "Public can view products for checkout by ID" ON public.products;
DROP POLICY IF EXISTS "Admins can view all products" ON public.products;
DROP POLICY IF EXISTS "Admins can update all products" ON public.products;
DROP POLICY IF EXISTS "Admins can view all products" ON public.products;
DROP POLICY IF EXISTS "Affiliates can view products they can promote" ON public.products;
DROP POLICY IF EXISTS "Users can create their own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;
DROP POLICY IF EXISTS "Users can update their own products" ON public.products;

-- Recriar políticas essenciais para products
-- 1. Vendedores podem ver seus próprios produtos
CREATE POLICY "Users can view their own products" 
ON public.products 
FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Permitir acesso público para produtos ativos que permitem afiliação (Kamba Extra)
CREATE POLICY "Public can view products for affiliates" 
ON public.products 
FOR SELECT 
USING (status = 'Ativo' AND allow_affiliates = true);

-- 3. Permitir acesso público para checkout (qualquer produto por ID)
CREATE POLICY "Public can view products for checkout" 
ON public.products 
FOR SELECT 
USING (true);

-- 4. Admins podem ver todos os produtos
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

-- 5. Vendedores podem gerenciar seus produtos
CREATE POLICY "Users can manage their own products" 
ON public.products 
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Admins podem atualizar qualquer produto
CREATE POLICY "Admins can update all products" 
ON public.products 
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE email = get_current_user_email() 
    AND is_active = true
  )
);