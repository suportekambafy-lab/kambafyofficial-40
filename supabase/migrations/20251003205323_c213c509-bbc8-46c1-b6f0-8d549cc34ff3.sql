-- Adicionar campo para vincular módulos a turmas específicas
ALTER TABLE public.modules
ADD COLUMN cohort_ids uuid[] DEFAULT NULL;

-- NULL = todas as turmas
-- Array vazio [] = nenhuma turma
-- Array com IDs = turmas específicas

COMMENT ON COLUMN public.modules.cohort_ids IS 'NULL = todas turmas, Array vazio = nenhuma turma, Array com IDs = turmas específicas';
