-- Criar turma padrão "Turma A" para áreas de membros existentes que não têm turmas
INSERT INTO public.member_area_cohorts (
  member_area_id,
  user_id,
  name,
  description,
  status,
  currency
)
SELECT 
  ma.id as member_area_id,
  ma.user_id,
  'Turma A' as name,
  'Turma padrão para todos os alunos' as description,
  'active' as status,
  'KZ' as currency
FROM public.member_areas ma
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.member_area_cohorts mac 
  WHERE mac.member_area_id = ma.id
);