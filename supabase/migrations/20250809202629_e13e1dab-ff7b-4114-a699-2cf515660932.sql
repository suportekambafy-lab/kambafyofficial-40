-- Limpar todos os dados de teste do projeto
-- ATENÇÃO: Esta operação irá deletar TODOS os dados, mantendo apenas a estrutura das tabelas

-- Desabilitar temporariamente as foreign key checks para evitar conflitos
SET session_replication_role = replica;

-- Limpar tabelas dependentes primeiro (ordem importa devido às foreign keys)

-- Limpar analytics e logs
DELETE FROM sales_recovery_analytics;
DELETE FROM recovery_fees;
DELETE FROM api_usage_logs;
DELETE FROM admin_logs;
DELETE FROM security_events;
DELETE FROM trusted_devices;

-- Limpar dados de aulas e progresso
DELETE FROM lesson_comments;
DELETE FROM lesson_progress;
DELETE FROM lessons;
DELETE FROM modules;
DELETE FROM member_area_students;
DELETE FROM member_areas;

-- Limpar configurações e customizações
DELETE FROM quiz_configurations;
DELETE FROM order_bump_items;
DELETE FROM order_bump_settings;
DELETE FROM checkout_customizations;
DELETE FROM facebook_pixel_settings;
DELETE FROM facebook_api_settings;

-- Limpar transações e saques
DELETE FROM payment_releases;
DELETE FROM balance_transactions;
DELETE FROM customer_balances;
DELETE FROM withdrawal_requests;

-- Limpar vendas e produtos
DELETE FROM abandoned_purchases;
DELETE FROM orders;
DELETE FROM affiliates;
DELETE FROM products;

-- Limpar dados de usuários
DELETE FROM push_subscriptions;
DELETE FROM kambapay_registrations;
DELETE FROM identity_verification;
DELETE FROM profiles;

-- Limpar notificações administrativas
DELETE FROM admin_notifications;

-- Reabilitar foreign key checks
SET session_replication_role = DEFAULT;

-- Resetar sequências se houver alguma
-- (Neste caso específico não temos sequências, mas é uma boa prática)

-- Verificar se as tabelas estão vazias
SELECT 
  schemaname,
  tablename,
  n_tup_ins as "Total Insertions",
  n_tup_upd as "Total Updates", 
  n_tup_del as "Total Deletions",
  n_live_tup as "Live Rows",
  n_dead_tup as "Dead Rows"
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;