-- Remover TODAS as políticas de products e recriar completamente
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'products'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.products';
    END LOOP;
END $$;

-- Agora recriar todas as políticas necessárias do zero
-- 1. Vendedores podem ver seus próprios produtos
CREATE POLICY "Users can view their own products" 
ON public.products 
FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Público pode ver produtos ativos que permitem afiliação (para Kamba Extra)
CREATE POLICY "Public can view products for affiliates" 
ON public.products 
FOR SELECT 
USING (status = 'Ativo' AND allow_affiliates = true);

-- 3. Acesso público para checkout
CREATE POLICY "Public can view products for checkout" 
ON public.products 
FOR SELECT 
USING (true);

-- 4. Vendedores podem criar seus produtos
CREATE POLICY "Users can create their own products" 
ON public.products 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 5. Vendedores podem atualizar seus produtos
CREATE POLICY "Users can update their own products" 
ON public.products 
FOR UPDATE 
USING (auth.uid() = user_id);

-- 6. Vendedores podem deletar seus produtos
CREATE POLICY "Users can delete their own products" 
ON public.products 
FOR DELETE 
USING (auth.uid() = user_id);

-- 7. Admins podem ver todos os produtos
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

-- 8. Admins podem atualizar qualquer produto
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