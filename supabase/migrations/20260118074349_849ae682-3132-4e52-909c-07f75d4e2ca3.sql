-- FIX CRÍTICO: Policies que referenciam admin_users diretamente causam 403 para vendedores
-- (a expressão da policy tenta ler admin_users e explode com "permission denied")

-- ORDERS
DROP POLICY IF EXISTS "Secure order viewing policy" ON public.orders;
DROP POLICY IF EXISTS "Sellers and admins can update orders" ON public.orders;

-- Recriar policy de SELECT sem acesso direto a admin_users
CREATE POLICY "Secure order viewing policy" ON public.orders
FOR SELECT TO authenticated
USING (
  -- Vendedor (dono do produto)
  EXISTS (
    SELECT 1
    FROM public.products
    WHERE products.id = orders.product_id
      AND products.user_id = auth.uid()
  )
  -- Caso legacy: orders.user_id
  OR (auth.uid() = orders.user_id)
  -- Cliente (por email)
  OR (public.get_current_user_email() = orders.customer_email)
  -- Afiliado
  OR (
    orders.affiliate_code IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.affiliates a
      WHERE a.affiliate_code::text = orders.affiliate_code::text
        AND a.affiliate_user_id = auth.uid()
        AND a.status = 'ativo'
    )
  )
  -- Admin (via função SECURITY DEFINER)
  OR public.is_authenticated_admin()
);

-- Recriar policy de UPDATE sem acesso direto a admin_users
CREATE POLICY "Sellers and admins can update orders" ON public.orders
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.products
    WHERE products.id = orders.product_id
      AND products.user_id = auth.uid()
  )
  OR public.is_authenticated_admin()
);
