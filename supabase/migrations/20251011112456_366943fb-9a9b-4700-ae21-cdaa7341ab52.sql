-- Ativar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remover cron jobs antigos caso existam
SELECT cron.unschedule('auto-release-payments-half-hour') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-release-payments-half-hour'
);

SELECT cron.unschedule('auto-release-payments-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-release-payments-daily'
);

-- Criar cron job para executar a cada 30 minutos
SELECT cron.schedule(
  'auto-release-payments-half-hour',
  '*/30 * * * *', -- A cada 30 minutos
  $$
  SELECT net.http_post(
    url:='https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/auto-release-payments',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjYmtxeWdkdHpweHZjdGZkcWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MDExODEsImV4cCI6MjA2NzA3NzE4MX0.RBg9ZnGehO-UWjtlLRdlGB0ELML9DH_ltChu2w9h62A"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- Criar cron job para executar diariamente às 9h (backup)
SELECT cron.schedule(
  'auto-release-payments-daily',
  '0 9 * * *', -- Diariamente às 9h da manhã
  $$
  SELECT net.http_post(
    url:='https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/auto-release-payments',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjYmtxeWdkdHpweHZjdGZkcWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MDExODEsImV4cCI6MjA2NzA3NzE4MX0.RBg9ZnGehO-UWjtlLRdlGB0ELML9DH_ltChu2w9h62A"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);