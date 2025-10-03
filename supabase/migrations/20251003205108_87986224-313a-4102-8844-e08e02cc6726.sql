-- Adicionar Turma A para Marca Milionária e atualizar número de alunos
INSERT INTO public.member_area_cohorts (
  member_area_id,
  user_id,
  name,
  description,
  status,
  currency,
  current_students
)
SELECT 
  '290b0398-c5f4-4681-944b-edc40f6fe0a2'::uuid,
  'a349acdf-584c-441e-adf8-d4bbfe217254'::uuid,
  'Turma A',
  'Turma padrão com todos os alunos',
  'active',
  'KZ',
  (SELECT COUNT(*) FROM member_area_students WHERE member_area_id = '290b0398-c5f4-4681-944b-edc40f6fe0a2')
WHERE NOT EXISTS (
  SELECT 1 FROM member_area_cohorts 
  WHERE member_area_id = '290b0398-c5f4-4681-944b-edc40f6fe0a2' 
  AND name = 'Turma A'
);