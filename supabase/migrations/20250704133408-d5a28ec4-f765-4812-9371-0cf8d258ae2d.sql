-- Remover política restritiva de inserção para orders
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;

-- Criar nova política que permite inserção de pedidos tanto para usuários autenticados quanto guests
CREATE POLICY "Anyone can create orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

-- Ajustar política de visualização para permitir que usuários vejam pedidos por email também
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

CREATE POLICY "Users can view their own orders" 
ON public.orders 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  (customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);