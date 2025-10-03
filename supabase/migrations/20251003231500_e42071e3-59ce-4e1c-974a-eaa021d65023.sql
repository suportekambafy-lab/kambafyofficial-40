-- Mover todos os alunos da TURMA EMPRESTIMO para Turma A
-- ID da Turma A: c7cde0b6-7b0b-4e72-9b19-8cd7f26e3b2a
-- ID da TURMA EMPRESTIMO: 353b3e9e-a3a7-448b-81a9-80177b4f93a2

UPDATE public.member_area_students
SET 
  cohort_id = 'c7cde0b6-7b0b-4e72-9b19-8cd7f26e3b2a',
  updated_at = NOW()
WHERE cohort_id = '353b3e9e-a3a7-448b-81a9-80177b4f93a2'
  AND member_area_id = '290b0398-c5f4-4681-944b-edc40f6fe0a2';

-- Atualizar contadores
UPDATE public.member_area_cohorts
SET current_students = (
  SELECT COUNT(*)
  FROM public.member_area_students
  WHERE cohort_id = member_area_cohorts.id
)
WHERE member_area_id = '290b0398-c5f4-4681-944b-edc40f6fe0a2';