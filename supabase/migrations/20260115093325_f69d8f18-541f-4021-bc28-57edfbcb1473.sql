-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule check-sislog-payments to run every 5 minutes
SELECT cron.schedule(
  'check-sislog-payments-cron',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/check-sislog-payments',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjYmtxeWdkdHpweHZjdGZkcWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM3NDE4NTgsImV4cCI6MjA0OTMxNzg1OH0.aGDCqH4V-ioz1E54-_6xRMpMXmL2TS_geFXi3aC1BnQ"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  ) AS request_id;
  $$
);