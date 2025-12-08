
-- ================================================
-- CORREÇÃO: Views com SECURITY DEFINER
-- Converter para SECURITY INVOKER para respeitar RLS
-- ================================================

-- 1. Recriar view balance_audit_discrepancies com SECURITY INVOKER
DROP VIEW IF EXISTS public.balance_audit_discrepancies;

CREATE VIEW public.balance_audit_discrepancies
WITH (security_invoker = true)
AS
SELECT 
  bt.user_id,
  p.full_name,
  p.email,
  round(COALESCE(sum(bt.amount), 0::numeric), 2) AS calculated_balance,
  round(COALESCE(cb.balance, 0::numeric), 2) AS stored_balance,
  round(COALESCE(sum(bt.amount), 0::numeric) - COALESCE(cb.balance, 0::numeric), 2) AS discrepancy,
  count(bt.id) AS total_transactions
FROM balance_transactions bt
LEFT JOIN customer_balances cb ON bt.user_id = cb.user_id
LEFT JOIN profiles p ON bt.user_id = p.user_id
WHERE bt.user_id IS NOT NULL
GROUP BY bt.user_id, cb.balance, p.full_name, p.email
HAVING abs(COALESCE(sum(bt.amount), 0::numeric) - COALESCE(cb.balance, 0::numeric)) > 0.01;

-- Comentário explicativo
COMMENT ON VIEW public.balance_audit_discrepancies IS 
'View de auditoria de saldos - usa SECURITY INVOKER para respeitar RLS. Apenas admins devem ter acesso.';

-- 2. Recriar view webhook_status com SECURITY INVOKER
DROP VIEW IF EXISTS public.webhook_status;

CREATE VIEW public.webhook_status
WITH (security_invoker = true)
AS
SELECT 
  ep.id,
  ep.order_id,
  ep.status AS payment_status,
  ep.webhook_sent,
  ep.webhook_attempts,
  ep.webhook_sent_at,
  ep.webhook_last_error,
  p.company_name AS partner_name,
  p.webhook_url,
  ep.created_at,
  ep.updated_at
FROM external_payments ep
JOIN partners p ON ep.partner_id = p.id
WHERE ep.status = ANY (ARRAY['completed'::text, 'failed'::text])
ORDER BY ep.updated_at DESC;

-- Comentário explicativo
COMMENT ON VIEW public.webhook_status IS 
'View de status de webhooks - usa SECURITY INVOKER para respeitar RLS. Apenas admins devem ter acesso.';

-- 3. Revogar acesso anónimo às views
REVOKE ALL ON public.balance_audit_discrepancies FROM anon;
REVOKE ALL ON public.webhook_status FROM anon;

-- 4. Conceder acesso apenas a authenticated (RLS das tabelas base será aplicado)
GRANT SELECT ON public.balance_audit_discrepancies TO authenticated;
GRANT SELECT ON public.webhook_status TO authenticated;

-- 5. service_role tem acesso total para operações administrativas
GRANT ALL ON public.balance_audit_discrepancies TO service_role;
GRANT ALL ON public.webhook_status TO service_role;
