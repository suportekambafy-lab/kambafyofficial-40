-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar tabela para registrar histórico de liberações automáticas
CREATE TABLE IF NOT EXISTS public.payment_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  order_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'KZ',
  release_date TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS na tabela de liberações
ALTER TABLE public.payment_releases ENABLE ROW LEVEL SECURITY;

-- Policy para usuários verem apenas suas próprias liberações
CREATE POLICY "Users can view own releases" ON public.payment_releases
FOR SELECT USING (user_id = auth.uid());

-- Policy para sistema inserir liberações
CREATE POLICY "System can insert releases" ON public.payment_releases
FOR INSERT WITH CHECK (true);

-- Agendar cron job para executar liberação automática todos os dias às 00:00 UTC
-- IMPORTANTE: Este cron job executará diariamente às 00:00 UTC
SELECT cron.schedule(
  'auto-release-payments-daily',
  '0 0 * * *', -- Todo dia às 00:00 UTC
  $$
  SELECT
    net.http_post(
      url := 'https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/auto-release-payments',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjYmtxeWdkdHpweHZjdGZkcWJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTUwMTE4MSwiZXhwIjoyMDY3MDc3MTgxfQ.qKwJ0GCK9dHlwgajcRvQGQOPGE5T8cUNP5IH_rN-OO4"}'::jsonb,
      body := jsonb_build_object(
        'scheduled_at', now(),
        'timezone', 'UTC'
      )
    ) as request_id;
  $$
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS payment_releases_user_id_idx ON public.payment_releases(user_id);
CREATE INDEX IF NOT EXISTS payment_releases_release_date_idx ON public.payment_releases(release_date);
CREATE INDEX IF NOT EXISTS payment_releases_processed_at_idx ON public.payment_releases(processed_at);