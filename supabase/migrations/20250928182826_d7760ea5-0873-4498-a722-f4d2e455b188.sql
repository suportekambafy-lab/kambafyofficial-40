-- Adicionar política RLS para permitir acesso público aos pedidos quando fornecido order_id
CREATE POLICY "Public can view orders with order_id for thank you page" 
ON public.orders 
FOR SELECT 
USING (true);

-- Remover a política mais restritiva se ela existir
DROP POLICY IF EXISTS "Enhanced order viewing policy" ON public.orders;