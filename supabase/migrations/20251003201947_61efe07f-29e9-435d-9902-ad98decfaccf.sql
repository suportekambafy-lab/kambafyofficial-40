-- Adicionar coluna cohort_id na tabela orders
ALTER TABLE public.orders
ADD COLUMN cohort_id UUID REFERENCES public.member_area_cohorts(id) ON DELETE SET NULL;

CREATE INDEX idx_orders_cohort ON public.orders(cohort_id);

-- Criar trigger para adicionar aluno à turma quando pedido for concluído
CREATE OR REPLACE FUNCTION public.add_student_to_cohort_on_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cohort_record RECORD;
BEGIN
  -- Só processar quando o status mudar para 'completed' e houver cohort_id
  IF NEW.status = 'completed' AND NEW.cohort_id IS NOT NULL THEN
    -- Buscar informações da turma
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
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS add_student_to_cohort_trigger ON public.orders;
CREATE TRIGGER add_student_to_cohort_trigger
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.add_student_to_cohort_on_purchase();