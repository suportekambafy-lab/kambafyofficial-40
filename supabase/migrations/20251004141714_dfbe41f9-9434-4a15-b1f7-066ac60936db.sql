-- Mover alunos sem turma para a Turma A
DO $$
DECLARE
  default_cohort_id UUID;
  affected_students INT;
BEGIN
  -- Buscar ID da Turma A
  SELECT id INTO default_cohort_id
  FROM public.member_area_cohorts
  WHERE member_area_id = '290b0398-c5f4-4681-944b-edc40f6fe0a2'
    AND name = 'Turma A'
    AND status = 'active'
  LIMIT 1;
  
  IF default_cohort_id IS NOT NULL THEN
    -- Mover alunos sem turma para Turma A
    UPDATE public.member_area_students
    SET cohort_id = default_cohort_id,
        updated_at = NOW()
    WHERE member_area_id = '290b0398-c5f4-4681-944b-edc40f6fe0a2'
      AND cohort_id IS NULL;
    
    GET DIAGNOSTICS affected_students = ROW_COUNT;
    
    -- Atualizar contador da Turma A
    UPDATE public.member_area_cohorts
    SET current_students = current_students + affected_students
    WHERE id = default_cohort_id;
    
    RAISE NOTICE 'Movidos % alunos para Turma A', affected_students;
  END IF;
END $$;

-- Modificar a trigger para NUNCA deixar alunos sem turma
CREATE OR REPLACE FUNCTION public.add_product_to_customer_purchases()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_record RECORD;
  order_id_generated TEXT;
  normalized_email TEXT;
  default_cohort_id UUID;
BEGIN
  -- Normalizar email para lowercase
  normalized_email := LOWER(TRIM(NEW.student_email));
  
  -- Buscar o produto associado à área de membros
  SELECT p.* INTO product_record
  FROM public.products p
  WHERE p.member_area_id = NEW.member_area_id
  LIMIT 1;
  
  -- Se encontrar o produto, criar registro de acesso
  IF product_record.id IS NOT NULL THEN
    -- Gerar um order_id único para o acesso via área de membros
    order_id_generated := 'member_access_' || NEW.member_area_id || '_' || normalized_email || '_' || EXTRACT(EPOCH FROM NOW())::bigint;
    
    -- Inserir na tabela customer_access para controle de acesso
    INSERT INTO public.customer_access (
      customer_email,
      customer_name,
      product_id,
      order_id,
      access_granted_at,
      access_expires_at,
      is_active
    )
    VALUES (
      normalized_email,
      NEW.student_name,
      product_record.id,
      order_id_generated,
      NEW.access_granted_at,
      NULL::timestamp with time zone, -- Acesso vitalício via área de membros
      true
    )
    ON CONFLICT (customer_email, product_id) DO UPDATE SET
      is_active = true,
      access_granted_at = GREATEST(customer_access.access_granted_at, NEW.access_granted_at),
      updated_at = NOW();
  END IF;
  
  -- Se não tem cohort_id, atribuir à Turma A automaticamente
  IF NEW.cohort_id IS NULL THEN
    SELECT id INTO default_cohort_id
    FROM public.member_area_cohorts
    WHERE member_area_id = NEW.member_area_id
      AND status = 'active'
      AND name = 'Turma A'
    LIMIT 1;
    
    IF default_cohort_id IS NOT NULL THEN
      NEW.cohort_id := default_cohort_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;