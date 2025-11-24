-- Criar tabela para armazenar pagamentos externos via API
CREATE TABLE IF NOT EXISTS public.external_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AOA',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('express', 'reference')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  
  -- Dados do cliente
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  
  -- Dados AppyPay
  appypay_transaction_id TEXT,
  reference_entity TEXT,
  reference_number TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Webhook
  webhook_sent BOOLEAN DEFAULT false,
  webhook_sent_at TIMESTAMP WITH TIME ZONE,
  webhook_attempts INTEGER DEFAULT 0,
  webhook_last_error TEXT,
  
  -- Metadados
  metadata JSONB,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_external_payments_partner_id ON public.external_payments(partner_id);
CREATE INDEX IF NOT EXISTS idx_external_payments_order_id ON public.external_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_external_payments_status ON public.external_payments(status);
CREATE INDEX IF NOT EXISTS idx_external_payments_appypay_id ON public.external_payments(appypay_transaction_id);
CREATE INDEX IF NOT EXISTS idx_external_payments_created_at ON public.external_payments(created_at DESC);

-- Constraint único para order_id por parceiro
CREATE UNIQUE INDEX IF NOT EXISTS idx_external_payments_partner_order ON public.external_payments(partner_id, order_id);

-- Trigger para updated_at
CREATE TRIGGER update_external_payments_updated_at
  BEFORE UPDATE ON public.external_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Adicionar colunas extras na tabela partners se não existirem
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'partners' AND column_name = 'webhook_secret') THEN
    ALTER TABLE public.partners ADD COLUMN webhook_secret TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'partners' AND column_name = 'webhook_events') THEN
    ALTER TABLE public.partners ADD COLUMN webhook_events TEXT[] DEFAULT ARRAY['payment.completed', 'payment.failed'];
  END IF;
END $$;

-- Função para enviar webhook (será chamada por trigger ou manualmente)
CREATE OR REPLACE FUNCTION public.send_external_payment_webhook()
RETURNS TRIGGER AS $$
DECLARE
  partner_record RECORD;
  webhook_payload JSONB;
BEGIN
  -- Só enviar webhook quando status mudar para completed ou failed
  IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status IN ('completed', 'failed')) THEN
    
    -- Buscar dados do parceiro
    SELECT * INTO partner_record
    FROM public.partners
    WHERE id = NEW.partner_id;
    
    -- Se tem webhook_url configurado, preparar para envio
    IF partner_record.webhook_url IS NOT NULL THEN
      
      -- Construir payload do webhook
      webhook_payload := jsonb_build_object(
        'event', CASE 
          WHEN NEW.status = 'completed' THEN 'payment.completed'
          WHEN NEW.status = 'failed' THEN 'payment.failed'
          ELSE 'payment.updated'
        END,
        'timestamp', NOW(),
        'data', jsonb_build_object(
          'id', NEW.id,
          'orderId', NEW.order_id,
          'transactionId', NEW.appypay_transaction_id,
          'amount', NEW.amount,
          'currency', NEW.currency,
          'paymentMethod', NEW.payment_method,
          'status', NEW.status,
          'customerName', NEW.customer_name,
          'customerEmail', NEW.customer_email,
          'customerPhone', NEW.customer_phone,
          'referenceEntity', NEW.reference_entity,
          'referenceNumber', NEW.reference_number,
          'completedAt', NEW.completed_at,
          'createdAt', NEW.created_at,
          'metadata', NEW.metadata
        )
      );
      
      -- Marcar para envio (a edge function vai processar)
      NEW.webhook_sent := false;
      NEW.webhook_attempts := 0;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para preparar webhook
DROP TRIGGER IF EXISTS trigger_send_external_payment_webhook ON public.external_payments;
CREATE TRIGGER trigger_send_external_payment_webhook
  BEFORE UPDATE ON public.external_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.send_external_payment_webhook();

-- RLS Policies (somente admin e edge functions podem acessar)
ALTER TABLE public.external_payments ENABLE ROW LEVEL SECURITY;

-- Admin pode ver tudo
CREATE POLICY "Admins can view all external payments"
  ON public.external_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND is_active = true
    )
  );

-- Service role pode tudo (edge functions)
CREATE POLICY "Service role can manage external payments"
  ON public.external_payments
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.external_payments IS 'Armazena pagamentos criados via API externa do Kambafy';
COMMENT ON COLUMN public.external_payments.order_id IS 'ID único do pedido no sistema do parceiro';
COMMENT ON COLUMN public.external_payments.webhook_sent IS 'Indica se webhook foi enviado com sucesso';
COMMENT ON COLUMN public.external_payments.metadata IS 'Dados adicionais do parceiro (JSON livre)';