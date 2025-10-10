-- Remover o cron job antigo (a cada hora)
SELECT cron.unschedule('auto-release-payments-hourly');

-- Criar novo cron job para liberar pagamentos a cada 30 minutos
SELECT cron.schedule(
  'auto-release-payments-half-hour',
  '*/30 * * * *', -- A cada 30 minutos
  $$
  SELECT
    net.http_post(
      url:='https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/auto-release-payments',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjYmtxeWdkdHpweHZjdGZkcWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MDExODEsImV4cCI6MjA2NzA3NzE4MX0.RBg9ZnGehO-UWjtlLRdlGB0ELML9DH_ltChu2w9h62A"}'::jsonb,
      body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Executar a função imediatamente para liberar pagamentos pendentes
SELECT
  net.http_post(
    url:='https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/auto-release-payments',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjYmtxeWdkdHpweHZjdGZkcWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MDExODEsImV4cCI6MjA2NzA3NzE4MX0.RBg9ZnGehO-UWjtlLRdlGB0ELML9DH_ltChu2w9h62A"}'::jsonb,
    body:='{"manual": true}'::jsonb
  ) as request_id;