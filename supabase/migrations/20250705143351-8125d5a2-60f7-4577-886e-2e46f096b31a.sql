
-- Corrigir políticas RLS para permitir checkout público
-- O problema é que a política atual está muito restritiva para inserções

-- Remover políticas existentes que podem estar causando conflito
DROP POLICY IF EXISTS "Enable public order creation" ON public.orders;
DROP POLICY IF EXISTS "Users can view relevant orders" ON public.orders;
DROP POLICY IF EXISTS "Sellers can update their orders" ON public.orders;

-- Criar política mais permissiva para inserção (necessário para checkout)
CREATE POLICY "Allow all order creation for checkout" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

-- Política para visualização - usuários podem ver pedidos se forem o vendedor OU se o email corresponder
CREATE POLICY "Users can view relevant orders" 
ON public.orders 
FOR SELECT 
USING (
  -- Vendedor pode ver seus pedidos
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR 
  -- Cliente pode ver pedidos com seu email
  (auth.uid() IS NOT NULL AND get_current_user_email() = customer_email) OR
  -- Permitir visualização para checkout sem auth (temporário)
  (auth.uid() IS NULL AND user_id IS NULL)
);

-- Política para atualização - apenas vendedores podem atualizar
CREATE POLICY "Sellers can update their orders" 
ON public.orders 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Garantir que user_id possa ser NULL para checkout de convidados
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;
