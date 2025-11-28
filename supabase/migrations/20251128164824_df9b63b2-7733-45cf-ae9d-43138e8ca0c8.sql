-- Atualizar função para adicionar automaticamente em múltiplas áreas de membros
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
  student_exists BOOLEAN;
  
  -- Variáveis para lógica de múltiplas áreas
  purchased_product_name TEXT;
  target_area_name TEXT;
  target_member_area RECORD;
  target_cohort RECORD;
BEGIN
  -- Só processar quando o status mudar para 'completed'
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;
  
  -- Buscar a member_area_id do produto comprado E o nome do produto
  SELECT p.id, p.name, p.member_area_id, p.user_id 
  INTO member_area_record
  FROM public.products p
  WHERE p.id = NEW.product_id;
  
  purchased_product_name := member_area_record.name;
  
  -- ========================================
  -- LÓGICA ESPECIAL: Milionário com IA
  -- ========================================
  IF purchased_product_name = 'Milionário com IA' THEN
    -- Adicionar em "Marca Milionária" - Turma A
    SELECT ma.id, ma.name, ma.user_id
    INTO target_member_area
    FROM public.member_areas ma
    WHERE ma.name = 'Marca Milionária'
    LIMIT 1;
    
    IF target_member_area.id IS NOT NULL THEN
      -- Buscar Turma A
      SELECT id, name INTO target_cohort
      FROM public.member_area_cohorts
      WHERE member_area_id = target_member_area.id
        AND name = 'Turma A'
        AND status = 'active'
      LIMIT 1;
      
      IF target_cohort.id IS NOT NULL THEN
        -- Verificar se já existe
        SELECT EXISTS (
          SELECT 1 FROM public.member_area_students
          WHERE member_area_id = target_member_area.id
            AND student_email = LOWER(TRIM(NEW.customer_email))
            AND cohort_id = target_cohort.id
        ) INTO student_exists;
        
        -- Adicionar aluno
        INSERT INTO public.member_area_students (
          member_area_id,
          student_email,
          student_name,
          cohort_id,
          access_granted_at
        )
        VALUES (
          target_member_area.id,
          LOWER(TRIM(NEW.customer_email)),
          NEW.customer_name,
          target_cohort.id,
          NOW()
        )
        ON CONFLICT (member_area_id, student_email) 
        DO UPDATE SET
          cohort_id = target_cohort.id,
          updated_at = NOW();
        
        -- Incrementar contador se não existia
        IF NOT student_exists THEN
          UPDATE public.member_area_cohorts
          SET current_students = current_students + 1
          WHERE id = target_cohort.id;
        END IF;
      END IF;
    END IF;
    
    -- Adicionar em "Google na Prática" - Turma A
    SELECT ma.id, ma.name, ma.user_id
    INTO target_member_area
    FROM public.member_areas ma
    WHERE ma.name = 'Google na Prática'
    LIMIT 1;
    
    IF target_member_area.id IS NOT NULL THEN
      -- Buscar Turma A
      SELECT id, name INTO target_cohort
      FROM public.member_area_cohorts
      WHERE member_area_id = target_member_area.id
        AND name = 'Turma A'
        AND status = 'active'
      LIMIT 1;
      
      IF target_cohort.id IS NOT NULL THEN
        -- Verificar se já existe
        SELECT EXISTS (
          SELECT 1 FROM public.member_area_students
          WHERE member_area_id = target_member_area.id
            AND student_email = LOWER(TRIM(NEW.customer_email))
            AND cohort_id = target_cohort.id
        ) INTO student_exists;
        
        -- Adicionar aluno
        INSERT INTO public.member_area_students (
          member_area_id,
          student_email,
          student_name,
          cohort_id,
          access_granted_at
        )
        VALUES (
          target_member_area.id,
          LOWER(TRIM(NEW.customer_email)),
          NEW.customer_name,
          target_cohort.id,
          NOW()
        )
        ON CONFLICT (member_area_id, student_email) 
        DO UPDATE SET
          cohort_id = target_cohort.id,
          updated_at = NOW();
        
        -- Incrementar contador se não existia
        IF NOT student_exists THEN
          UPDATE public.member_area_cohorts
          SET current_students = current_students + 1
          WHERE id = target_cohort.id;
        END IF;
      END IF;
    END IF;
  END IF;
  
  -- ========================================
  -- LÓGICA PADRÃO (área do próprio produto)
  -- ========================================
  
  -- Se o produto não tem área de membros, não fazer nada mais
  IF member_area_record.member_area_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Se já tem cohort_id definido no pedido, usar esse (link personalizado)
  IF NEW.cohort_id IS NOT NULL THEN
    -- Verificar se o aluno já existe nessa turma
    SELECT EXISTS (
      SELECT 1 FROM public.member_area_students
      WHERE member_area_id = member_area_record.member_area_id
        AND student_email = LOWER(TRIM(NEW.customer_email))
        AND cohort_id = NEW.cohort_id
    ) INTO student_exists;
    
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
      
      -- Só incrementar contador se o aluno NÃO existia nessa turma
      IF NOT student_exists THEN
        UPDATE public.member_area_cohorts
        SET current_students = current_students + 1
        WHERE id = NEW.cohort_id;
      END IF;
      
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
      -- Verificar se o aluno já existe na Turma A
      SELECT EXISTS (
        SELECT 1 FROM public.member_area_students
        WHERE member_area_id = member_area_record.member_area_id
          AND student_email = LOWER(TRIM(NEW.customer_email))
          AND cohort_id = default_cohort_id
      ) INTO student_exists;
      
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
      
      -- Só incrementar contador se o aluno NÃO existia na Turma A
      IF NOT student_exists THEN
        UPDATE public.member_area_cohorts
        SET current_students = current_students + 1
        WHERE id = default_cohort_id;
      END IF;
      
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