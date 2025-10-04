-- Mover TODOS os alunos sem turma para suas respectivas Turmas A (em TODAS as áreas de membros)
DO $$
DECLARE
  area_record RECORD;
  default_cohort_id UUID;
  affected_students INT;
  total_moved INT := 0;
BEGIN
  -- Para cada área de membros
  FOR area_record IN 
    SELECT DISTINCT ma.id as member_area_id, ma.name as area_name
    FROM member_areas ma
    INNER JOIN member_area_students mas ON ma.id = mas.member_area_id
    WHERE mas.cohort_id IS NULL
  LOOP
    -- Buscar ID da Turma A dessa área
    SELECT id INTO default_cohort_id
    FROM public.member_area_cohorts
    WHERE member_area_id = area_record.member_area_id
      AND name = 'Turma A'
      AND status = 'active'
    LIMIT 1;
    
    IF default_cohort_id IS NOT NULL THEN
      -- Mover alunos sem turma para Turma A
      UPDATE public.member_area_students
      SET cohort_id = default_cohort_id,
          updated_at = NOW()
      WHERE member_area_id = area_record.member_area_id
        AND cohort_id IS NULL;
      
      GET DIAGNOSTICS affected_students = ROW_COUNT;
      
      -- Atualizar contador da Turma A
      UPDATE public.member_area_cohorts
      SET current_students = (
        SELECT COUNT(*) 
        FROM public.member_area_students 
        WHERE cohort_id = default_cohort_id
      )
      WHERE id = default_cohort_id;
      
      total_moved := total_moved + affected_students;
      RAISE NOTICE 'Área "%": Movidos % alunos para Turma A', area_record.area_name, affected_students;
    ELSE
      RAISE NOTICE 'Área "%": Não tem Turma A ativa', area_record.area_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'TOTAL: Movidos % alunos sem turma para suas respectivas Turmas A', total_moved;
END $$;