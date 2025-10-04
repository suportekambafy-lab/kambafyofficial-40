-- Corrigir função para usar "Turma A" como turma padrão
-- Turmas personalizadas só devem receber alunos via link específico ou adição manual

CREATE OR REPLACE FUNCTION public.add_student_to_cohort_on_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cohort_record RECORD;
  default_cohort_id UUID;
  member_area_record RECORD;
BEGIN
  -- Só processar quando o status mudar para 'completed'
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;
  
  -- Buscar a member_area_id do produto comprado
  SELECT p.id, p.member_area_id, p.user_id 
  INTO member_area_record
  FROM public.products p
  WHERE p.id = NEW.product_id;
  
  -- Se o produto não tem área de membros, não fazer nada
  IF member_area_record.member_area_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Se já tem cohort_id definido no pedido, usar esse (link personalizado)
  IF NEW.cohort_id IS NOT NULL THEN
    -- Buscar informações da turma especificada
    SELECT * INTO cohort_record
    FROM public.member_area_cohorts
    WHERE id = NEW.cohort_id;
    
    IF cohort_record.id IS NOT NULL THEN
      -- Adicionar aluno à turma através da tabela member_area_students
      INSERT INTO public.member_area_students (
        member_area_id,
        student_email,
        student_name,
        cohort_id,
        access_granted_at
      )
      VALUES (
        cohort_record.member_area_id,
        LOWER(TRIM(NEW.customer_email)),
        NEW.customer_name,
        NEW.cohort_id,
        NOW()
      )
      ON CONFLICT (member_area_id, student_email) 
      DO UPDATE SET
        cohort_id = NEW.cohort_id,
        updated_at = NOW();
      
      -- Incrementar contador de alunos da turma
      UPDATE public.member_area_cohorts
      SET current_students = current_students + 1
      WHERE id = NEW.cohort_id;
      
      -- Se atingiu o máximo, marcar como lotada
      UPDATE public.member_area_cohorts
      SET status = 'full'
      WHERE id = NEW.cohort_id 
        AND max_students IS NOT NULL 
        AND current_students >= max_students;
    END IF;
  ELSE
    -- Se não tem cohort_id, buscar a "Turma A" como turma padrão
    SELECT id INTO default_cohort_id
    FROM public.member_area_cohorts
    WHERE member_area_id = member_area_record.member_area_id
      AND status = 'active'
      AND name = 'Turma A'
    LIMIT 1;
    
    IF default_cohort_id IS NOT NULL THEN
      -- Adicionar aluno à Turma A (padrão)
      INSERT INTO public.member_area_students (
        member_area_id,
        student_email,
        student_name,
        cohort_id,
        access_granted_at
      )
      VALUES (
        member_area_record.member_area_id,
        LOWER(TRIM(NEW.customer_email)),
        NEW.customer_name,
        default_cohort_id,
        NOW()
      )
      ON CONFLICT (member_area_id, student_email) 
      DO UPDATE SET
        cohort_id = default_cohort_id,
        updated_at = NOW();
      
      -- Incrementar contador
      UPDATE public.member_area_cohorts
      SET current_students = current_students + 1
      WHERE id = default_cohort_id;
      
      -- Atualizar o pedido com o cohort_id da Turma A
      NEW.cohort_id := default_cohort_id;
    ELSE
      -- Se não encontrar "Turma A", adicionar sem turma
      INSERT INTO public.member_area_students (
        member_area_id,
        student_email,
        student_name,
        access_granted_at
      )
      VALUES (
        member_area_record.member_area_id,
        LOWER(TRIM(NEW.customer_email)),
        NEW.customer_name,
        NOW()
      )
      ON CONFLICT (member_area_id, student_email) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;