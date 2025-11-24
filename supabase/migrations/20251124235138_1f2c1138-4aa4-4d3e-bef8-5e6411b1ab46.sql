-- Corrigir view webhook_status para não ser SECURITY DEFINER
DROP VIEW IF EXISTS public.webhook_status;

-- Recriar sem SECURITY DEFINER
CREATE VIEW public.webhook_status AS
SELECT 
  ep.id,
  ep.order_id,
  ep.status as payment_status,
  ep.webhook_sent,
  ep.webhook_attempts,
  ep.webhook_sent_at,
  ep.webhook_last_error,
  p.company_name as partner_name,
  p.webhook_url,
  ep.created_at,
  ep.updated_at
FROM public.external_payments ep
JOIN public.partners p ON ep.partner_id = p.id
WHERE ep.status IN ('completed', 'failed')
ORDER BY ep.updated_at DESC;