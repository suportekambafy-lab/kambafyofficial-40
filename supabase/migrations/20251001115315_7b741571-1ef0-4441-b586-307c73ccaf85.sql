-- Permitir NULL na coluna user_id para membros não autenticados via auth tradicional
-- Esses membros serão identificados apenas pelo user_email

ALTER TABLE public.lesson_progress 
ALTER COLUMN user_id DROP NOT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.lesson_progress.user_id IS 'UUID do usuário autenticado via Supabase Auth. NULL para membros identificados apenas por email (member area sessions).';