-- ========================================
-- 🔄 CONFIGURAÇÃO DE CRON JOBS - ASSINATURAS
-- ========================================
-- Este SQL configura 3 cron jobs automatizados para gerenciar
-- o ciclo de vida das assinaturas manuais

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ========================================
-- CRON JOB 1: Verificar Renovações (09:00 diariamente)
-- ========================================
-- Dispara lembretes 7, 3, 1 dia antes do vencimento
SELECT cron.schedule(
  'check-subscriptions-renewal',
  '0 9 * * *', -- Todo dia às 09:00
  $$
  SELECT net.http_post(
    url:='https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/check-subscriptions-renewal',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjYmtxeWdkdHpweHZjdGZkcWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MDExODEsImV4cCI6MjA2NzA3NzE4MX0.RBg9ZnGehO-UWjtlLRdlGB0ELML9DH_ltChu2w9h62A"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- ========================================
-- CRON JOB 2: Suspender Expiradas (00:00 diariamente)
-- ========================================
-- Suspende assinaturas que venceram, bloqueia acesso e envia email de reativação
SELECT cron.schedule(
  'suspend-expired-subscriptions',
  '0 0 * * *', -- Todo dia à meia-noite
  $$
  SELECT net.http_post(
    url:='https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/suspend-expired-subscriptions',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjYmtxeWdkdHpweHZjdGZkcWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MDExODEsImV4cCI6MjA2NzA3NzE4MX0.RBg9ZnGehO-UWjtlLRdlGB0ELML9DH_ltChu2w9h62A"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- ========================================
-- CRON JOB 3: Cancelar Após Período de Graça (01:00 diariamente)
-- ========================================
-- Cancela assinaturas que excederam o período de graça
SELECT cron.schedule(
  'cancel-grace-period-expired',
  '0 1 * * *', -- Todo dia à 01:00
  $$
  SELECT net.http_post(
    url:='https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/cancel-grace-period-expired',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjYmtxeWdkdHpweHZjdGZkcWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MDExODEsImV4cCI6MjA2NzA3NzE4MX0.RBg9ZnGehO-UWjtlLRdlGB0ELML9DH_ltChu2w9h62A"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);