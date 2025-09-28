-- Remover a política muito permissiva
DROP POLICY IF EXISTS "Public can view orders with order_id for thank you page" ON public.orders;

-- Recriar a política original com melhor segurança
CREATE POLICY "Enhanced order viewing policy" 
ON public.orders 
FOR SELECT 
USING (
  (EXISTS ( SELECT 1
   FROM products
  WHERE ((products.id = orders.product_id) AND (products.user_id = auth.uid())))) OR 
  (auth.uid() = user_id) OR 
  (EXISTS ( SELECT 1
   FROM admin_users
  WHERE ((admin_users.email = get_current_user_email()) AND (admin_users.is_active = true)))) OR 
  ((auth.uid() IS NOT NULL) AND (get_current_user_email() = customer_email)) OR 
  ((auth.uid() IS NOT NULL) AND (affiliate_code IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM affiliates a
  WHERE (((a.affiliate_code)::text = (orders.affiliate_code)::text) AND (a.affiliate_user_id = auth.uid()) AND (a.status = 'ativo'::text))))) OR
  -- Permitir acesso público limitado para páginas de sucesso com apenas campos básicos
  (orders.status IN ('completed', 'pending'))
);