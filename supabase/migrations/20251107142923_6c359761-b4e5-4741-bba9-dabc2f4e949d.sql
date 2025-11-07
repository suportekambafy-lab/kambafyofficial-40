-- Adicionar suporte a assinaturas na tabela products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS subscription_config JSONB DEFAULT NULL;

COMMENT ON COLUMN products.subscription_config IS 'Configuração de assinatura: {"interval": "month"|"year", "interval_count": 1, "stripe_price_id": "price_xxx", "trial_days": 7}';

-- Criar tabela de assinaturas de clientes
CREATE TABLE IF NOT EXISTS customer_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_email 
  ON customer_subscriptions(customer_email);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_product 
  ON customer_subscriptions(product_id);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_stripe_id 
  ON customer_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_status 
  ON customer_subscriptions(status);

-- RLS Policies
ALTER TABLE customer_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedores veem assinaturas dos seus produtos"
  ON customer_subscriptions FOR SELECT
  USING (
    product_id IN (
      SELECT id FROM products WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins veem todas assinaturas"
  ON customer_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND is_active = true
    )
  );

-- Criar tabela de eventos de assinatura (histórico)
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES customer_subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT,
  amount NUMERIC,
  currency TEXT DEFAULT 'KZ',
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription 
  ON subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type 
  ON subscription_events(event_type);

-- RLS para subscription_events
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedores veem eventos das suas assinaturas"
  ON subscription_events FOR SELECT
  USING (
    subscription_id IN (
      SELECT cs.id FROM customer_subscriptions cs
      JOIN products p ON cs.product_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Atualizar função check_customer_access para incluir assinaturas
CREATE OR REPLACE FUNCTION public.check_customer_access(
  p_customer_email TEXT,
  p_product_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  subscription_record RECORD;
  access_record RECORD;
BEGIN
  -- Normalizar email
  p_customer_email := LOWER(TRIM(p_customer_email));
  
  -- Verificar se tem assinatura ativa
  SELECT * INTO subscription_record
  FROM customer_subscriptions
  WHERE customer_email = p_customer_email
    AND product_id = p_product_id
    AND status IN ('active', 'trialing')
    AND current_period_end > now();
  
  IF subscription_record IS NOT NULL THEN
    RETURN true;
  END IF;
  
  -- Verificar acesso de compra única (lógica existente)
  SELECT * INTO access_record
  FROM public.customer_access
  WHERE customer_email = p_customer_email
    AND product_id = p_product_id
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF access_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Se access_expires_at é NULL, é acesso vitalício
  IF access_record.access_expires_at IS NULL THEN
    RETURN true;
  END IF;
  
  -- Verificar se ainda não expirou
  RETURN access_record.access_expires_at > now();
END;
$$ LANGUAGE plpgsql STABLE;

-- Função para sincronizar customer_access com assinaturas
CREATE OR REPLACE FUNCTION sync_subscription_access()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('active', 'trialing') THEN
    INSERT INTO customer_access (
      customer_email,
      customer_name,
      product_id,
      order_id,
      access_expires_at,
      is_active
    ) VALUES (
      NEW.customer_email,
      NEW.customer_name,
      NEW.product_id,
      'sub_' || NEW.stripe_subscription_id,
      NEW.current_period_end,
      true
    )
    ON CONFLICT (customer_email, product_id) 
    DO UPDATE SET
      access_expires_at = NEW.current_period_end,
      is_active = true,
      updated_at = now();
  ELSIF NEW.status IN ('canceled', 'unpaid', 'past_due') THEN
    UPDATE customer_access
    SET 
      is_active = CASE 
        WHEN NEW.status = 'past_due' THEN true -- Manter ativo durante grace period
        ELSE false 
      END,
      access_expires_at = NEW.current_period_end,
      updated_at = now()
    WHERE customer_email = NEW.customer_email
      AND product_id = NEW.product_id
      AND order_id = 'sub_' || NEW.stripe_subscription_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER sync_subscription_access_trigger
  AFTER INSERT OR UPDATE ON customer_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_access();

-- Trigger para atualizar updated_at
CREATE TRIGGER update_customer_subscriptions_updated_at
  BEFORE UPDATE ON customer_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();