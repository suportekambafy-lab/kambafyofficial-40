-- Limpar todos os dados da plataforma para fase de teste
-- Desabilitar triggers temporariamente para evitar conflitos
SET session_replication_role = replica;

-- Deletar dados das tabelas principais (ordem importante por causa das foreign keys)
DELETE FROM public.lesson_comments;
DELETE FROM public.lesson_progress;
DELETE FROM public.lessons;
DELETE FROM public.modules;
DELETE FROM public.member_area_students;
DELETE FROM public.member_areas;

DELETE FROM public.order_bump_items;
DELETE FROM public.order_bump_settings;
DELETE FROM public.checkout_customizations;
DELETE FROM public.facebook_pixel_settings;
DELETE FROM public.facebook_api_settings;
DELETE FROM public.webhook_logs;
DELETE FROM public.webhook_settings;

DELETE FROM public.payment_releases;
DELETE FROM public.orders;
DELETE FROM public.products;

DELETE FROM public.withdrawal_requests;
DELETE FROM public.withdraw_requests;

DELETE FROM public.trusted_devices;
DELETE FROM public.security_events;
DELETE FROM public.user_2fa_settings;

DELETE FROM public.admin_logs;
DELETE FROM public.admin_users;

DELETE FROM public.profiles;

-- Reabilitar triggers
SET session_replication_role = DEFAULT;

-- Reset sequences para começar do 1 novamente (se houver)
-- As tabelas usam UUID, então não há sequences para resetar

-- Limpar dados de autenticação (isso vai remover todos os usuários)
-- ATENÇÃO: Isso vai deletar todos os usuários do sistema
DELETE FROM auth.users;

-- Limpar storage buckets de uploads (opcional - descomente se quiser limpar arquivos)
-- DELETE FROM storage.objects WHERE bucket_id IN ('avatars', 'member-videos');

-- Mensagem de confirmação
SELECT 'Todos os dados da plataforma foram limpos com sucesso!' as message;