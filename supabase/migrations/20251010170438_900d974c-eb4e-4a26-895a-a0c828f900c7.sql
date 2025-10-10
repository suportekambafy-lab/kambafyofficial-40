-- Fase 1 e 6: Adicionar campos de expiração e motivo de cancelamento
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Criar índice para melhorar performance das queries de limpeza
CREATE INDEX IF NOT EXISTS idx_orders_expires_at ON orders(expires_at) 
WHERE status = 'pending';

-- Comentário para documentação
COMMENT ON COLUMN orders.cancellation_reason IS 
  'Razão do cancelamento: expired_reference, expired_payment_session, payment_failed, expired_legacy, manual_cancellation';

-- Fase 5: Limpeza de pedidos históricos pendentes há mais de 7 dias
UPDATE orders
SET 
  status = 'cancelled',
  cancellation_reason = 'expired_legacy',
  updated_at = NOW()
WHERE status = 'pending'
  AND expires_at IS NULL
  AND created_at < NOW() - INTERVAL '7 days';

-- Fase 3: Configurar cron job para cancelamento automático (executar a cada 15 minutos)
SELECT cron.schedule(
  'auto-cancel-expired-orders',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/auto-cancel-expired-orders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjYmtxeWdkdHpweHZjdGZkcWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MDExODEsImV4cCI6MjA2NzA3NzE4MX0.RBg9ZnGehO-UWjtlLRdlGB0ELML9DH_ltChu2w9h62A"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);