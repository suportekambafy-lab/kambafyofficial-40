
-- Corrigir a política RLS para permitir inserção de pedidos
-- A política atual está muito restritiva e não permite inserção para usuários não autenticados

-- Primeiro, vamos verificar e corrigir a política de inserção
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Criar nova política mais permissiva para inserção de pedidos
-- Permite que qualquer pessoa crie pedidos (necessário para checkout sem login)
CREATE POLICY "Allow order creation for checkout" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

-- Manter a política de visualização mais restritiva
-- Usuários só podem ver seus próprios pedidos ou pedidos com seu email
-- Esta política já existe e está funcionando corretamente
