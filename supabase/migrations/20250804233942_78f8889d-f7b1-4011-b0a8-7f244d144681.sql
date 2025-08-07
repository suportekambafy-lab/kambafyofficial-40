-- Remover a constraint de foreign key que está causando o erro
ALTER TABLE public.withdrawal_requests 
DROP CONSTRAINT IF EXISTS withdrawal_requests_admin_processed_by_fkey;

-- Tornar a coluna admin_processed_by opcional e permitir valores que não existem em admin_users
ALTER TABLE public.withdrawal_requests 
ALTER COLUMN admin_processed_by DROP NOT NULL;