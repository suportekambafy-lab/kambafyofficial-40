-- =============================================
-- CORREÇÃO DE SEGURANÇA - PARTE 3 (FINAL)
-- =============================================

-- 1. chat_messages - Remover políticas públicas
DROP POLICY IF EXISTS "Anyone can view messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Public can view messages" ON public.chat_messages;

-- 2. chat_conversations - Remover políticas públicas
DROP POLICY IF EXISTS "Anyone can view conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Public can view conversations" ON public.chat_conversations;

-- 3. refund_requests - Proteger dados de reembolso
DROP POLICY IF EXISTS "Anyone can view refunds" ON public.refund_requests;
DROP POLICY IF EXISTS "Public can view refund requests" ON public.refund_requests;
DROP POLICY IF EXISTS "Sellers can view refund requests for their products" ON public.refund_requests;
DROP POLICY IF EXISTS "Buyers can view their own refund requests" ON public.refund_requests;
DROP POLICY IF EXISTS "Admins can view all refund requests" ON public.refund_requests;

-- Criar políticas corretas para refund_requests
CREATE POLICY "Sellers can view refund requests for their products"
ON public.refund_requests
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM products p
  WHERE p.id = refund_requests.product_id
  AND p.user_id = auth.uid()
));

CREATE POLICY "Buyers can view their own refund requests"
ON public.refund_requests
FOR SELECT
USING (buyer_email = get_current_user_email());

CREATE POLICY "Admins can view all refund requests"
ON public.refund_requests
FOR SELECT
USING (is_admin());

-- 4. module_payments - Já tem policies mas vamos garantir que não tem públicas
DROP POLICY IF EXISTS "Anyone can view module payments" ON public.module_payments;
DROP POLICY IF EXISTS "Public can view module payments" ON public.module_payments;

-- 5. module_student_access - Já tem policies mas vamos garantir que não tem públicas
DROP POLICY IF EXISTS "Anyone can view module access" ON public.module_student_access;
DROP POLICY IF EXISTS "Public can view module access" ON public.module_student_access;

-- 6. member_area_cohorts - Proteger métricas de negócio
DROP POLICY IF EXISTS "Anyone can view cohorts" ON public.member_area_cohorts;
DROP POLICY IF EXISTS "Public can view cohorts" ON public.member_area_cohorts;