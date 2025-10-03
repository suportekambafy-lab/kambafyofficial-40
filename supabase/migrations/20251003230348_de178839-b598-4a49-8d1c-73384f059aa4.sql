-- Função melhorada para atribuir turma padrão aos alunos que compraram
-- Quando um aluno compra um produto com turma associada, ele é automaticamente adicionado

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
  
  -- Se já tem cohort_id definido no pedido, usar esse
  IF NEW.cohort_id IS NOT NULL THEN
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
  ELSE
    -- Se não tem cohort_id no pedido, buscar a turma padrão (primeira turma ativa)
    -- do member_area associado ao produto
    SELECT ma.id, ma.user_id INTO member_area_record
    FROM public.products p
    JOIN public.member_areas ma ON p.member_area_id = ma.id
    WHERE p.id = NEW.product_id;
    
    IF member_area_record.id IS NOT NULL THEN
      -- Buscar a primeira turma ativa da área (turma padrão)
      SELECT id INTO default_cohort_id
      FROM public.member_area_cohorts
      WHERE member_area_id = member_area_record.id
        AND status = 'active'
      ORDER BY created_at ASC
      LIMIT 1;
      
      IF default_cohort_id IS NOT NULL THEN
        -- Adicionar aluno à turma padrão
        INSERT INTO public.member_area_students (
          member_area_id,
          student_email,
          student_name,
          cohort_id,
          access_granted_at
        )
        VALUES (
          member_area_record.id,
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
        
        -- Atualizar o pedido com o cohort_id
        UPDATE public.orders
        SET cohort_id = default_cohort_id
        WHERE id = NEW.id;
      ELSE
        -- Se não tem turma ativa, adicionar sem turma
        INSERT INTO public.member_area_students (
          member_area_id,
          student_email,
          student_name,
          access_granted_at
        )
        VALUES (
          member_area_record.id,
          LOWER(TRIM(NEW.customer_email)),
          NEW.customer_name,
          NOW()
        )
        ON CONFLICT (member_area_id, student_email) DO NOTHING;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Adicionar coluna updated_at se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'member_area_students' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.member_area_students 
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Criar trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_member_area_students_updated_at ON public.member_area_students;
CREATE TRIGGER update_member_area_students_updated_at 
BEFORE UPDATE ON public.member_area_students
FOR EACH ROW 
EXECUTE FUNCTION public.update_updated_at_column();

-- Atualizar alunos existentes que não têm turma para a primeira turma ativa de sua área
UPDATE public.member_area_students mas
SET cohort_id = (
  SELECT id 
  FROM public.member_area_cohorts 
  WHERE member_area_id = mas.member_area_id
    AND status = 'active'
  ORDER BY created_at ASC
  LIMIT 1
),
updated_at = NOW()
WHERE cohort_id IS NULL
  AND EXISTS (
    SELECT 1 
    FROM public.member_area_cohorts 
    WHERE member_area_id = mas.member_area_id
      AND status = 'active'
  );