-- =============================================
-- CORREÇÃO DE SEGURANÇA - PARTE 2 (CORRIGIDA)
-- =============================================

-- 1. lesson_comments - Remover política pública
DROP POLICY IF EXISTS "Anyone can view comments" ON public.lesson_comments;

-- 2. member_area_students - Proteger lista de estudantes
DROP POLICY IF EXISTS "Anyone can view students" ON public.member_area_students;
DROP POLICY IF EXISTS "Public can view students" ON public.member_area_students;
DROP POLICY IF EXISTS "Area owners can view their students" ON public.member_area_students;
DROP POLICY IF EXISTS "Students can view their own enrollment" ON public.member_area_students;

CREATE POLICY "Area owners can view their students"
ON public.member_area_students
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM member_areas ma
  WHERE ma.id = member_area_students.member_area_id
  AND ma.user_id = auth.uid()
));

CREATE POLICY "Students can view their own enrollment"
ON public.member_area_students
FOR SELECT
USING (student_email = get_current_user_email());

-- 3. partners - Garantir RLS e proteção
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view partners" ON public.partners;
DROP POLICY IF EXISTS "Public can view partners" ON public.partners;
DROP POLICY IF EXISTS "Partners can view their own data" ON public.partners;
DROP POLICY IF EXISTS "Admins can view all partners" ON public.partners;

CREATE POLICY "Partners can view their own data"
ON public.partners
FOR SELECT
USING (api_key = current_setting('request.headers', true)::json->>'x-api-key');

CREATE POLICY "Admins can view all partners"
ON public.partners
FOR SELECT
USING (is_admin());

-- 4. withdrawal_requests - Garantir proteção (se policies não existem)
DROP POLICY IF EXISTS "Anyone can view withdrawals" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Public can view withdrawals" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can view their own withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admins can view all withdrawal requests" ON public.withdrawal_requests;

CREATE POLICY "Users can view their own withdrawal requests"
ON public.withdrawal_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawal requests"
ON public.withdrawal_requests
FOR SELECT
USING (is_admin());

-- 5. Remover políticas públicas restantes
DROP POLICY IF EXISTS "Anyone can view transactions" ON public.balance_transactions;
DROP POLICY IF EXISTS "Public can view transactions" ON public.balance_transactions;
DROP POLICY IF EXISTS "Anyone can view customer access" ON public.customer_access;
DROP POLICY IF EXISTS "Public can view customer access" ON public.customer_access;
DROP POLICY IF EXISTS "Anyone can view external payments" ON public.external_payments;
DROP POLICY IF EXISTS "Public can view external payments" ON public.external_payments;
DROP POLICY IF EXISTS "Anyone can view subscriptions" ON public.customer_subscriptions;
DROP POLICY IF EXISTS "Public can view subscriptions" ON public.customer_subscriptions;
DROP POLICY IF EXISTS "Anyone can view abandoned" ON public.abandoned_purchases;
DROP POLICY IF EXISTS "Public can view abandoned" ON public.abandoned_purchases;
DROP POLICY IF EXISTS "Public can view orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;
DROP POLICY IF EXISTS "Anon can view completed orders" ON public.orders;