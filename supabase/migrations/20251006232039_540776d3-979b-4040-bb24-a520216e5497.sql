-- Excluir todos os pagamentos de módulo exceto o do sneeperhelton@gmail.com
DELETE FROM public.module_payments
WHERE student_email != 'sneeperhelton@gmail.com';