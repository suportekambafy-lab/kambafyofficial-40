-- ==========================================
-- FASE 1: Sistema Híbrido de Assinaturas
-- ==========================================

-- 1. Documentar subscription_config em products
COMMENT ON COLUMN products.subscription_config IS 
'Configuração de assinatura (JSONB):
{
  "interval": "month|year",
  "stripe_price_id": "price_xxx",
  "trial_days": number (opcional),
  "grace_period_days": number (opcional, 0 = sem período de graça),
  "reactivation_discount_percentage": number (opcional, 0-100),
  "allow_reactivation": boolean (padrão: true)
}';

-- Criar índice GIN para consultas JSONB em products
CREATE INDEX IF NOT EXISTS idx_products_subscription_config 
ON products USING GIN (subscription_config);

-- 2. Atualizar customer_subscriptions com campos de renovação manual
ALTER TABLE customer_subscriptions
ADD COLUMN IF NOT EXISTS renewal_type TEXT DEFAULT 'automatic',
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS last_renewal_reminder TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS suspension_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reactivation_count INTEGER DEFAULT 0;

-- Constraint para renewal_type
DO $$ BEGIN
  ALTER TABLE customer_subscriptions
  ADD CONSTRAINT check_renewal_type 
  CHECK (renewal_type IN ('automatic', 'manual'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_renewal_type 
ON customer_subscriptions(renewal_type);

CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end 
ON customer_subscriptions(current_period_end) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_subscriptions_grace_period 
ON customer_subscriptions(grace_period_end) 
WHERE grace_period_end IS NOT NULL;

-- 3. Criar tabela subscription_renewal_reminders (histórico de lembretes)
CREATE TABLE IF NOT EXISTS subscription_renewal_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES customer_subscriptions(id) ON DELETE CASCADE,
  days_before INTEGER NOT NULL,
  reminder_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  
  CONSTRAINT check_days_before CHECK (days_before IN (7, 3, 1)),
  CONSTRAINT check_reminder_type CHECK (reminder_type IN ('email', 'push'))
);

CREATE INDEX IF NOT EXISTS idx_renewal_reminders_subscription 
ON subscription_renewal_reminders(subscription_id);

CREATE INDEX IF NOT EXISTS idx_renewal_reminders_sent_at 
ON subscription_renewal_reminders(sent_at DESC);

-- RLS para subscription_renewal_reminders
ALTER TABLE subscription_renewal_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendedores veem lembretes de suas assinaturas" ON subscription_renewal_reminders;
CREATE POLICY "Vendedores veem lembretes de suas assinaturas"
ON subscription_renewal_reminders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM customer_subscriptions cs
    JOIN products p ON cs.product_id = p.id
    WHERE cs.id = subscription_renewal_reminders.subscription_id
    AND p.user_id = auth.uid()
  )
);

-- 4. Criar tabela subscription_renewal_tokens (tokens únicos para renovação)
CREATE TABLE IF NOT EXISTS subscription_renewal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES customer_subscriptions(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT check_token_not_empty CHECK (length(token) > 0)
);

CREATE INDEX IF NOT EXISTS idx_renewal_tokens_token ON subscription_renewal_tokens(token);
CREATE INDEX IF NOT EXISTS idx_renewal_tokens_subscription ON subscription_renewal_tokens(subscription_id);
CREATE INDEX IF NOT EXISTS idx_renewal_tokens_expires ON subscription_renewal_tokens(expires_at);

-- RLS: Tokens são públicos para quem tem o link
ALTER TABLE subscription_renewal_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer um pode validar tokens" ON subscription_renewal_tokens;
CREATE POLICY "Qualquer um pode validar tokens"
ON subscription_renewal_tokens FOR SELECT
USING (expires_at > now() AND used_at IS NULL);

-- 5. Function: generate_renewal_token
CREATE OR REPLACE FUNCTION generate_renewal_token(
  p_subscription_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Gerar token único (base64 de 32 bytes)
  v_token := encode(gen_random_bytes(32), 'base64');
  v_token := replace(v_token, '/', '_');
  v_token := replace(v_token, '+', '-');
  v_token := replace(v_token, '=', '');
  
  v_expires_at := now() + INTERVAL '30 days';
  
  -- Inserir token
  INSERT INTO subscription_renewal_tokens (
    subscription_id, token, expires_at
  ) VALUES (
    p_subscription_id, v_token, v_expires_at
  );
  
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;