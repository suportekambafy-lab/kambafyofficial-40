-- CORREÇÃO CRÍTICA: Políticas RLS que impedem vendedores de ver seus dados

-- =====================================================
-- 1. CORRIGIR POLICIES DE ORDERS
-- =====================================================

-- Remover policies duplicadas/conflitantes de orders
DROP POLICY IF EXISTS "Sellers can view orders of their products" ON orders;
DROP POLICY IF EXISTS "Sellers can view their orders" ON orders;
DROP POLICY IF EXISTS "Sellers can update orders of their products" ON orders;

-- Criar policy unificada para vendedores verem orders (usando authenticated)
CREATE POLICY "sellers_view_own_orders" ON orders
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM products p 
    WHERE p.id = orders.product_id 
    AND p.user_id = auth.uid()
  )
);

-- Criar policy para vendedores atualizarem orders
CREATE POLICY "sellers_update_own_orders" ON orders
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM products p 
    WHERE p.id = orders.product_id 
    AND p.user_id = auth.uid()
  )
);

-- =====================================================
-- 2. CORRIGIR POLICIES DE PRODUCTS
-- =====================================================

-- Garantir que vendedores podem ver TODOS os seus produtos (não só ativos)
DROP POLICY IF EXISTS "Sellers can view their own products" ON products;

CREATE POLICY "sellers_view_all_own_products" ON products
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- 3. CORRIGIR POLICIES DE BALANCE_TRANSACTIONS
-- =====================================================

-- Remover policies duplicadas
DROP POLICY IF EXISTS "Users can view own transactions" ON balance_transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON balance_transactions;
DROP POLICY IF EXISTS "Users can view their transactions" ON balance_transactions;

-- Criar uma única policy para usuários
CREATE POLICY "users_view_own_transactions" ON balance_transactions
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- 4. CORRIGIR POLICIES DE CURRENCY_BALANCES
-- =====================================================

-- Remover policy problemática com "true" que pode causar conflitos
DROP POLICY IF EXISTS "Service role can manage currency balances" ON currency_balances;

-- Garantir que usuários podem ver seus saldos
DROP POLICY IF EXISTS "Users can view their own currency balances" ON currency_balances;

CREATE POLICY "users_view_own_currency_balances" ON currency_balances
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- 5. GARANTIR QUE PROFILES FUNCIONA CORRETAMENTE
-- =====================================================

-- A policy existente "Users can view only their own profile" deve funcionar
-- Mas vamos garantir que está usando authenticated corretamente
DROP POLICY IF EXISTS "Users can view only their own profile" ON profiles;

CREATE POLICY "users_view_own_profile" ON profiles
FOR SELECT TO authenticated
USING (user_id = auth.uid());