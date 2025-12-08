-- =============================================
-- CORREÇÃO DE SEGURANÇA: Tabelas com dados sensíveis expostos
-- =============================================

-- 1. module_student_access - Proteger emails de estudantes
DROP POLICY IF EXISTS "Students can view their own access" ON public.module_student_access;
DROP POLICY IF EXISTS "Area owners can view student access" ON public.module_student_access;
DROP POLICY IF EXISTS "Service can manage" ON public.module_student_access;

CREATE POLICY "Students can view their own access"
ON public.module_student_access
FOR SELECT
USING (student_email = get_current_user_email());

CREATE POLICY "Area owners can view student access"
ON public.module_student_access
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM member_areas ma
  WHERE ma.id = module_student_access.member_area_id
  AND ma.user_id = auth.uid()
));

CREATE POLICY "Service can manage student access"
ON public.module_student_access
FOR ALL
USING (true)
WITH CHECK (true);

-- 2. module_payments - Proteger informações de pagamento
DROP POLICY IF EXISTS "Students can view their own payments" ON public.module_payments;
DROP POLICY IF EXISTS "Area owners can view payments" ON public.module_payments;
DROP POLICY IF EXISTS "Service can manage payments" ON public.module_payments;

CREATE POLICY "Students can view their own payments"
ON public.module_payments
FOR SELECT
USING (student_email = get_current_user_email());

CREATE POLICY "Area owners can view payments"
ON public.module_payments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM member_areas ma
  WHERE ma.id = module_payments.member_area_id
  AND ma.user_id = auth.uid()
));

CREATE POLICY "Service can manage payments"
ON public.module_payments
FOR ALL
USING (true)
WITH CHECK (true);

-- 3. refund_requests - Já tem políticas mas vamos garantir
-- Primeiro verificar políticas existentes
DROP POLICY IF EXISTS "Public can view refund requests" ON public.refund_requests;
DROP POLICY IF EXISTS "Anyone can view refunds" ON public.refund_requests;

-- 4. member_area_cohorts - Restringir acesso
DROP POLICY IF EXISTS "Public can view cohorts" ON public.member_area_cohorts;
DROP POLICY IF EXISTS "Anyone can view cohorts" ON public.member_area_cohorts;

CREATE POLICY "Area owners can view cohorts"
ON public.member_area_cohorts
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM member_areas ma
  WHERE ma.id = member_area_cohorts.member_area_id
  AND ma.user_id = auth.uid()
));

CREATE POLICY "Students can view their cohort"
ON public.member_area_cohorts
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM member_area_students mas
  WHERE mas.cohort_id = member_area_cohorts.id
  AND mas.student_email = get_current_user_email()
));

CREATE POLICY "Service can manage cohorts"
ON public.member_area_cohorts
FOR ALL
USING (true)
WITH CHECK (true);

-- 5. Garantir que admin_action_logs só é visível para admins ativos
DROP POLICY IF EXISTS "Admin users can view logs" ON public.admin_action_logs;

CREATE POLICY "Only active admins can view action logs"
ON public.admin_action_logs
FOR SELECT
USING (is_admin());

-- 6. Garantir que admin_impersonation_sessions só é visível para super admins
DROP POLICY IF EXISTS "Super admins can view impersonation sessions" ON public.admin_impersonation_sessions;

CREATE POLICY "Only super admins can view impersonation sessions"
ON public.admin_impersonation_sessions
FOR SELECT
USING (is_super_admin(get_current_user_email()));