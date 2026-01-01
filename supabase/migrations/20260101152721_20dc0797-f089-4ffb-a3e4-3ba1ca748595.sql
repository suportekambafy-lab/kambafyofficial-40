-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Criar cron job para cancelar orders pendentes a cada hora
SELECT cron.schedule(
  'auto-cancel-expired-orders',
  '0 * * * *', -- A cada hora, no minuto 0
  $$
  SELECT net.http_post(
    url := 'https://kfrxlxqrpwtmjklgvfsd.supabase.co/functions/v1/auto-cancel-expired-orders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmcnhseHFycHd0bWprbGd2ZnNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk2MDU2MjcsImV4cCI6MjA0NTE4MTYyN30.tMhvkCwGx3hLru-NUv2BqlmI3ZyMxHexS9hW9L4RA3M'
    ),
    body := jsonb_build_object('triggered_by', 'cron', 'time', now())
  ) AS request_id;
  $$
);