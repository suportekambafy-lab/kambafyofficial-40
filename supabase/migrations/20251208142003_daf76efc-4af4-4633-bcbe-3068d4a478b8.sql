-- =============================================
-- CORREÇÃO DE SEGURANÇA - PARTE 4 (AJUSTE)
-- =============================================

-- orders - Drop e recriar policies para evitar conflitos
DROP POLICY IF EXISTS "Sellers can view their orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can view their completed orders only" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;

CREATE POLICY "Sellers can view their orders"
ON public.orders
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM products p
  WHERE p.id = orders.product_id
  AND p.user_id = auth.uid()
));

CREATE POLICY "Customers can view their completed orders only"
ON public.orders
FOR SELECT
USING (
  customer_email = get_current_user_email() 
  AND status = 'completed'
);

CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
USING (is_admin());

-- customer_subscriptions - Adicionar política para clientes (se não existe)
DROP POLICY IF EXISTS "Customers can view their own subscriptions" ON public.customer_subscriptions;
CREATE POLICY "Customers can view their own subscriptions"
ON public.customer_subscriptions
FOR SELECT
USING (customer_email = get_current_user_email());

-- customer_access - Adicionar política para clientes
DROP POLICY IF EXISTS "Customers can view their own access" ON public.customer_access;
CREATE POLICY "Customers can view their own access"
ON public.customer_access
FOR SELECT
USING (customer_email = get_current_user_email());

-- external_payments - Adicionar política para clientes
DROP POLICY IF EXISTS "Customers can view their own external payments" ON public.external_payments;
CREATE POLICY "Customers can view their own external payments"
ON public.external_payments
FOR SELECT
USING (customer_email = get_current_user_email());

-- Garantir RLS está ativo em tabelas sensíveis
ALTER TABLE public.abandoned_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_impersonation_sessions ENABLE ROW LEVEL SECURITY;