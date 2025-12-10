-- =====================================================
-- FIX: Remover política que expõe TODOS os estudantes
-- =====================================================

-- Remover a política permissiva que usa "true"
DROP POLICY IF EXISTS "Public can check student access for login" ON public.member_area_students;

-- Remover política duplicada de INSERT permissiva
DROP POLICY IF EXISTS "Only service role can add students" ON public.member_area_students;

-- =====================================================
-- Criar função segura para verificar acesso de estudante (para login)
-- Permite verificar se um email específico tem acesso, sem expor lista
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_student_access(
  p_member_area_id uuid,
  p_student_email text
)
RETURNS TABLE(
  has_access boolean,
  student_name text,
  cohort_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true as has_access,
    mas.student_name,
    mas.cohort_id
  FROM member_area_students mas
  WHERE mas.member_area_id = p_member_area_id
    AND LOWER(mas.student_email) = LOWER(p_student_email)
  LIMIT 1;
  
  -- Se não encontrou, retornar false
  IF NOT FOUND THEN
    RETURN QUERY SELECT false as has_access, NULL::text as student_name, NULL::uuid as cohort_id;
  END IF;
END;
$$;

-- =====================================================
-- Criar função segura para buscar estudantes por email (para sessões)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_student_by_email_for_session(
  p_member_area_id uuid,
  p_student_email text
)
RETURNS TABLE(
  id uuid,
  student_email text,
  student_name text,
  member_area_id uuid,
  cohort_id uuid,
  access_granted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mas.id,
    mas.student_email,
    mas.student_name,
    mas.member_area_id,
    mas.cohort_id,
    mas.access_granted_at
  FROM member_area_students mas
  WHERE mas.member_area_id = p_member_area_id
    AND LOWER(mas.student_email) = LOWER(p_student_email)
  LIMIT 1;
END;
$$;