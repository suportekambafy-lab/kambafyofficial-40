-- Gerar API key para o usuário e criar registro de parceiro
INSERT INTO public.partners (
  company_name,
  contact_email,
  contact_name,
  phone,
  status,
  api_key,
  webhook_url,
  webhook_secret,
  commission_rate,
  monthly_transaction_limit,
  approved_at,
  created_at,
  updated_at
) VALUES (
  'Kambafy Main Account',
  'admin@kambafy.com',
  'Admin Kambafy',
  '+244 900 000 000',
  'approved',
  'kp_' || encode(gen_random_bytes(32), 'hex'),
  'https://seu-app.com/webhook/kambafy',
  encode(gen_random_bytes(32), 'hex'),
  2.0,
  100000000,
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (contact_email) DO UPDATE SET
  api_key = COALESCE(partners.api_key, EXCLUDED.api_key),
  webhook_secret = COALESCE(partners.webhook_secret, EXCLUDED.webhook_secret),
  updated_at = NOW();

-- Função auxiliar para verificar assinatura webhook (para uso no seu app)
CREATE OR REPLACE FUNCTION public.verify_webhook_signature(
  payload TEXT,
  signature TEXT,
  secret TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- Verifica se a assinatura HMAC-SHA256 está correta
  RETURN signature = encode(hmac(payload::bytea, secret::bytea, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.verify_webhook_signature IS 'Verifica a assinatura HMAC-SHA256 de um webhook do Kambafy';

-- View útil para monitorar webhooks
CREATE OR REPLACE VIEW public.webhook_status AS
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