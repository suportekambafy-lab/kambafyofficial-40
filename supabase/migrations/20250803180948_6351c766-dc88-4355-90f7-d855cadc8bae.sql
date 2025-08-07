-- Atualizar política RLS da tabela orders para permitir que afiliados vejam suas vendas
DROP POLICY IF EXISTS "Sellers and customers can view relevant orders" ON public.orders;

-- Nova política que inclui afiliados
CREATE POLICY "Sellers, customers and affiliates can view relevant orders" 
ON public.orders 
FOR SELECT 
USING (
  -- Vendedor pode ver suas vendas
  (auth.uid() = user_id) 
  OR 
  -- Cliente pode ver suas compras
  ((auth.uid() IS NOT NULL) AND (get_current_user_email() = customer_email)) 
  OR 
  -- Afiliado pode ver vendas com seu código
  (
    auth.uid() IS NOT NULL 
    AND affiliate_code IS NOT NULL 
    AND EXISTS (
      SELECT 1 
      FROM affiliates a 
      WHERE a.affiliate_code = orders.affiliate_code 
      AND a.affiliate_user_id = auth.uid()
      AND a.status = 'ativo'
    )
  )
  OR 
  -- Admin pode ver tudo
  (EXISTS ( 
    SELECT 1
    FROM admin_users
    WHERE admin_users.email = get_current_user_email() 
    AND admin_users.is_active = true
  ))
);