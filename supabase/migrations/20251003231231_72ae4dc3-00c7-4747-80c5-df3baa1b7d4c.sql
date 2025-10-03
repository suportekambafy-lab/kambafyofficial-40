-- Sincronizar contadores de alunos de todas as turmas com a contagem real
-- Atualiza o current_students para refletir o número real de alunos

UPDATE public.member_area_cohorts c
SET current_students = (
  SELECT COUNT(*)
  FROM public.member_area_students mas
  WHERE mas.cohort_id = c.id
)
WHERE c.id IN (
  SELECT DISTINCT id FROM public.member_area_cohorts
);

-- Log dos resultados para verificação
DO $$
DECLARE
  cohort_record RECORD;
BEGIN
  FOR cohort_record IN 
    SELECT 
      c.id,
      c.name,
      c.current_students,
      COUNT(mas.id) as actual_count
    FROM member_area_cohorts c
    LEFT JOIN member_area_students mas ON mas.cohort_id = c.id
    GROUP BY c.id, c.name, c.current_students
  LOOP
    RAISE NOTICE 'Turma: %, Contador atualizado: %', cohort_record.name, cohort_record.current_students;
  END LOOP;
END $$;