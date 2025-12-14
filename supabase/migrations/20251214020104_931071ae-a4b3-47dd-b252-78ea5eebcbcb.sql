-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create cron job to process cart recovery every hour
SELECT cron.schedule(
  'process-cart-recovery-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT net.http_post(
    url := 'https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/process-cart-recovery',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjYmtxeWdkdHpweHZjdGZkcWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MDExODEsImV4cCI6MjA2NzA3NzE4MX0.RBg9ZnGehO-UWjtlLRdlGB0ELML9DH_ltChu2w9h62A"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);