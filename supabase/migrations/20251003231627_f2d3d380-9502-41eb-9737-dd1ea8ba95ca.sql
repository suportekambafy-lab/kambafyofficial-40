-- Atribuir TODOS os alunos sem turma à primeira turma ativa de cada área de membros
-- Esta migração corrige dados históricos para TODAS as áreas de membros do Kambafy

UPDATE public.member_area_students mas
SET 
  cohort_id = (
    SELECT c.id 
    FROM public.member_area_cohorts c
    WHERE c.member_area_id = mas.member_area_id
      AND c.status = 'active'
    ORDER BY c.created_at ASC
    LIMIT 1
  ),
  updated_at = NOW()
WHERE mas.cohort_id IS NULL
  AND EXISTS (
    SELECT 1 
    FROM public.member_area_cohorts c
    WHERE c.member_area_id = mas.member_area_id
      AND c.status = 'active'
  );

-- Atualizar contadores de TODAS as turmas
UPDATE public.member_area_cohorts c
SET current_students = (
  SELECT COUNT(*)
  FROM public.member_area_students mas
  WHERE mas.cohort_id = c.id
);

-- Log de verificação
DO $$
DECLARE
  area_record RECORD;
  total_fixed INTEGER := 0;
BEGIN
  FOR area_record IN 
    SELECT 
      ma.id,
      ma.name,
      COUNT(mas.id) as students_fixed
    FROM member_areas ma
    JOIN member_area_students mas ON mas.member_area_id = ma.id
    WHERE mas.updated_at > NOW() - INTERVAL '1 minute'
    GROUP BY ma.id, ma.name
  LOOP
    total_fixed := total_fixed + area_record.students_fixed;
    RAISE NOTICE 'Área: % - Alunos atribuídos: %', area_record.name, area_record.students_fixed;
  END LOOP;
  
  RAISE NOTICE 'Total de alunos atribuídos a turmas: %', total_fixed;
END $$;