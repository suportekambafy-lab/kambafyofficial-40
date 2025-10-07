-- ============================================
-- CONFIGURAR CRON JOB: Auto-release de pagamentos diário
-- ============================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Remover job anterior se existir
SELECT cron.unschedule('auto-release-payments-daily');

-- 3. Criar cron job para rodar todos os dias às 9h da manhã
SELECT cron.schedule(
  'auto-release-payments-daily',
  '0 9 * * *', -- Todos os dias às 9h (hora de Angola)
  $$
  SELECT
    net.http_post(
      url:='https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/auto-release-payments',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjYmtxeWdkdHpweHZjdGZkcWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MDExODEsImV4cCI6MjA2NzA3NzE4MX0.RBg9ZnGehO-UWjtlLRdlGB0ELML9DH_ltChu2w9h62A"}'::jsonb,
      body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- 4. Verificar se o job foi criado com sucesso
SELECT 
  jobid, 
  schedule, 
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job 
WHERE jobname = 'auto-release-payments-daily';