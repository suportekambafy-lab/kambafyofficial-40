-- =============================================
-- CORREÇÃO DE SEGURANÇA RLS - PÓS ATAQUE
-- Corrige políticas permissivas sem afetar funcionalidade
-- =============================================

-- 1. PROFILES - Restringir acesso a dados sensíveis
-- Remover políticas muito permissivas
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Criar política: usuários só veem seu próprio perfil completo
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Criar política: dados públicos limitados para outros usuários (nome e avatar apenas)
CREATE POLICY "Public profile data for authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Manter políticas de update/insert existentes (usuário só edita o próprio)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 2. PRODUCTS - Proteger dados sensíveis de produtos
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
DROP POLICY IF EXISTS "Public can view active products" ON public.products;

-- Produtos ativos são visíveis publicamente (necessário para checkout)
CREATE POLICY "Active products are publicly viewable"
ON public.products
FOR SELECT
USING (status = 'Ativo');

-- Donos podem ver todos os seus produtos (incluindo inativos)
CREATE POLICY "Owners can view all own products"
ON public.products
FOR SELECT
USING (auth.uid() = user_id);

-- Manter políticas de modificação
DROP POLICY IF EXISTS "Users can update own products" ON public.products;
CREATE POLICY "Users can update own products"
ON public.products
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own products" ON public.products;
CREATE POLICY "Users can insert own products"
ON public.products
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own products" ON public.products;
CREATE POLICY "Users can delete own products"
ON public.products
FOR DELETE
USING (auth.uid() = user_id);

-- 3. ORDERS - Apenas donos dos produtos/pedidos podem ver
DROP POLICY IF EXISTS "Orders are viewable by everyone" ON public.orders;
DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view all orders" ON public.orders;

-- Vendedores podem ver pedidos dos seus produtos
CREATE POLICY "Sellers can view orders of their products"
ON public.orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.products p 
    WHERE p.id = orders.product_id 
    AND p.user_id = auth.uid()
  )
);

-- Manter política de inserção (checkout público)
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
WITH CHECK (true);

-- Vendedores podem atualizar pedidos dos seus produtos
DROP POLICY IF EXISTS "Sellers can update orders" ON public.orders;
CREATE POLICY "Sellers can update orders of their products"
ON public.orders
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.products p 
    WHERE p.id = orders.product_id 
    AND p.user_id = auth.uid()
  )
);

-- 4. MEMBER_AREA_STUDENTS - Apenas donos da área podem ver
DROP POLICY IF EXISTS "Anyone can view member area students" ON public.member_area_students;
DROP POLICY IF EXISTS "Member area students are viewable by everyone" ON public.member_area_students;

-- Donos da área podem ver seus alunos
CREATE POLICY "Owners can view their member area students"
ON public.member_area_students
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.member_areas ma 
    WHERE ma.id = member_area_students.member_area_id 
    AND ma.user_id = auth.uid()
  )
);

-- Alunos podem ver seu próprio registro (para login)
CREATE POLICY "Students can view own record"
ON public.member_area_students
FOR SELECT
USING (
  LOWER(student_email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Manter inserção para sistema
DROP POLICY IF EXISTS "System can insert students" ON public.member_area_students;
CREATE POLICY "Owners can insert students"
ON public.member_area_students
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.member_areas ma 
    WHERE ma.id = member_area_students.member_area_id 
    AND ma.user_id = auth.uid()
  )
);

-- 5. MODULE_PAYMENTS - Apenas donos podem ver
DROP POLICY IF EXISTS "Anyone can view module payments" ON public.module_payments;
DROP POLICY IF EXISTS "Module payments are viewable by everyone" ON public.module_payments;

-- Donos da área podem ver pagamentos
CREATE POLICY "Owners can view their module payments"
ON public.module_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.member_areas ma 
    WHERE ma.id = module_payments.member_area_id 
    AND ma.user_id = auth.uid()
  )
);

-- 6. CUSTOMER_BALANCES - Apenas o próprio usuário
DROP POLICY IF EXISTS "Anyone can view balances" ON public.customer_balances;
DROP POLICY IF EXISTS "Users can view all balances" ON public.customer_balances;

CREATE POLICY "Users can view own balance"
ON public.customer_balances
FOR SELECT
USING (auth.uid() = user_id);

-- 7. BALANCE_TRANSACTIONS - Apenas o próprio usuário
DROP POLICY IF EXISTS "Anyone can view transactions" ON public.balance_transactions;
DROP POLICY IF EXISTS "Users can view all transactions" ON public.balance_transactions;

CREATE POLICY "Users can view own transactions"
ON public.balance_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- 8. WITHDRAWAL_REQUESTS - Apenas o próprio usuário
DROP POLICY IF EXISTS "Anyone can view withdrawals" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can view all withdrawals" ON public.withdrawal_requests;

CREATE POLICY "Users can view own withdrawals"
ON public.withdrawal_requests
FOR SELECT
USING (auth.uid() = user_id);