-- Primeiro, remover qualquer constraint antiga se existir
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'lesson_progress_user_email_lesson_member_unique'
    ) THEN
        ALTER TABLE public.lesson_progress 
        DROP CONSTRAINT lesson_progress_user_email_lesson_member_unique;
    END IF;
END $$;

-- Criar a constraint única com o nome correto
ALTER TABLE public.lesson_progress
ADD CONSTRAINT lesson_progress_unique_email_lesson_area 
UNIQUE (user_email, lesson_id, member_area_id);

-- Comentário para documentação
COMMENT ON CONSTRAINT lesson_progress_unique_email_lesson_area ON public.lesson_progress IS 
'Garante que cada combinação de email, lesson e member_area é única para rastreamento de progresso';