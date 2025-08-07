-- Corrigir políticas RLS para afiliados - apenas donos do produto podem ver afiliados
DROP POLICY IF EXISTS "Users can view affiliates for their products" ON public.affiliates;

-- Política mais específica para vendedores verem apenas afiliados dos seus produtos
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

-- Política para vendedores gerenciarem afiliados dos seus produtos
DROP POLICY IF EXISTS "Product owners can update affiliate requests" ON public.affiliates;

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

-- Garantir que orders só sejam visíveis para o vendedor do produto ou o comprador
DROP POLICY IF EXISTS "Users can view orders" ON public.orders;

CREATE POLICY "Sellers and customers can view relevant orders" 
ON public.orders 
FOR SELECT 
USING (
  -- Vendedor pode ver pedidos dos seus produtos
  auth.uid() = user_id 
  OR 
  -- Cliente pode ver seus próprios pedidos
  (auth.uid() IS NOT NULL AND get_current_user_email() = customer_email)
  OR
  -- Admin pode ver todos (mantido para compatibilidade)
  (EXISTS (SELECT 1 FROM admin_users WHERE email = get_current_user_email() AND is_active = true))
);