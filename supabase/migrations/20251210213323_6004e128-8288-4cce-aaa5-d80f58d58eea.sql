-- =====================================================
-- FIX: Remover política permissiva que expõe TODOS os pedidos
-- =====================================================

-- Remover a política permissiva que usa "true"
DROP POLICY IF EXISTS "Public can view own orders by email" ON public.orders;

-- A política "Secure order viewing policy" já existe e é restritiva:
-- - Vendedores veem pedidos dos seus produtos
-- - Usuários veem seus próprios pedidos (user_id ou email)
-- - Afiliados veem pedidos com seu código
-- - Admins veem tudo

-- Também remover políticas INSERT duplicadas/permissivas demais
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;

-- A política "Allow checkout order creation" já é adequada:
-- ((user_id IS NULL) OR (auth.uid() = user_id))