-- Limpar todos os dados de teste do projeto
-- ATENÇÃO: Esta operação irá deletar TODOS os dados, mantendo apenas a estrutura das tabelas

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