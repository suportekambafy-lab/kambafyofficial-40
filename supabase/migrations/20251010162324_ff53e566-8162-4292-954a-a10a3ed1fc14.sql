-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar cron job para liberar pagamentos a cada hora (ou recriar se já existir)
SELECT cron.schedule(
  'auto-release-payments-hourly',
  '0 * * * *', -- A cada hora no minuto 0
  $$
  SELECT
    net.http_post(
      url:='https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/auto-release-payments',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjYmtxeWdkdHpweHZjdGZkcWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MDExODEsImV4cCI6MjA2NzA3NzE4MX0.RBg9ZnGehO-UWjtlLRdlGB0ELML9DH_ltChu2w9h62A"}'::jsonb,
      body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);