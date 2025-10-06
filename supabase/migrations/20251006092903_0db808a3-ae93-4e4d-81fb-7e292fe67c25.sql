-- Adicionar campo para controle de módulos pagos por turma
ALTER TABLE public.modules
ADD COLUMN paid_cohort_ids uuid[] DEFAULT NULL;

COMMENT ON COLUMN public.modules.paid_cohort_ids IS 'IDs das turmas que precisam pagar pelo módulo. NULL = todas as turmas precisam pagar';