-- Remover política antiga se existir
DROP POLICY IF EXISTS "Students can view published lessons" ON public.lessons;

-- Criar nova política melhorada que respeita módulos pagos por turma
CREATE POLICY "Students can view accessible lessons"
ON public.lessons
FOR SELECT
USING (
  status = 'published'
  AND (
    -- Proprietário da área pode ver tudo
    EXISTS (
      SELECT 1 FROM member_areas ma
      WHERE ma.id = lessons.member_area_id
      AND ma.user_id = auth.uid()
    )
    
    -- OU aluno autenticado vendo lessons de módulos acessíveis
    OR (
      EXISTS (
        SELECT 1 
        FROM member_area_students mas
        WHERE mas.member_area_id = lessons.member_area_id
        AND mas.student_email = get_current_user_email()
      )
      AND (
        -- Sem módulo associado (aulas diretas na área)
        lessons.module_id IS NULL
        
        -- OU módulo não é pago
        OR NOT EXISTS (
          SELECT 1 FROM modules m
          WHERE m.id = lessons.module_id
          AND m.is_paid = true
        )
        
        -- OU módulo é pago MAS aluno NÃO está na lista de turmas pagas (gratuito para essa turma)
        OR EXISTS (
          SELECT 1 
          FROM modules m
          JOIN member_area_students mas ON mas.member_area_id = lessons.member_area_id
          WHERE m.id = lessons.module_id
          AND m.is_paid = true
          AND mas.student_email = get_current_user_email()
          AND NOT (m.paid_cohort_ids @> ARRAY[mas.cohort_id]::uuid[])
        )
        
        -- OU aluno tem acesso individual ao módulo
        OR EXISTS (
          SELECT 1 FROM module_student_access msa
          WHERE msa.module_id = lessons.module_id
          AND msa.student_email = get_current_user_email()
        )
      )
    )
    
    -- OU acesso via sessão de membro (sem autenticação Supabase)
    OR (
      EXISTS (
        SELECT 1 
        FROM member_area_sessions sess
        WHERE sess.member_area_id = lessons.member_area_id
        AND sess.expires_at > now()
      )
      AND (
        lessons.module_id IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM modules m
          WHERE m.id = lessons.module_id
          AND m.is_paid = true
        )
        OR EXISTS (
          SELECT 1 
          FROM member_area_students mas
          JOIN modules m ON m.id = lessons.module_id
          JOIN member_area_sessions sess ON sess.member_area_id = mas.member_area_id
          WHERE mas.student_email = sess.student_email
          AND m.id = lessons.module_id
          AND m.is_paid = true
          AND sess.expires_at > now()
          AND NOT (m.paid_cohort_ids @> ARRAY[mas.cohort_id]::uuid[])
        )
        OR EXISTS (
          SELECT 1 
          FROM module_student_access msa
          JOIN member_area_sessions sess ON sess.student_email = msa.student_email
          WHERE msa.module_id = lessons.module_id
          AND sess.expires_at > now()
        )
      )
    )
  )
);

-- Criar função auxiliar para verificação de acesso a módulos
CREATE OR REPLACE FUNCTION public.student_has_module_access(
  _student_email text,
  _module_id uuid,
  _member_area_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  module_is_paid boolean;
  student_cohort_id uuid;
  paid_cohorts uuid[];
BEGIN
  -- Verificar se módulo existe e é pago
  SELECT is_paid, paid_cohort_ids INTO module_is_paid, paid_cohorts
  FROM modules
  WHERE id = _module_id;
  
  -- Se módulo não é pago, tem acesso
  IF NOT module_is_paid OR module_is_paid IS NULL THEN
    RETURN true;
  END IF;
  
  -- Buscar turma do aluno
  SELECT cohort_id INTO student_cohort_id
  FROM member_area_students
  WHERE student_email = _student_email
    AND member_area_id = _member_area_id
  LIMIT 1;
  
  -- Se turma do aluno NÃO está na lista de turmas pagas, tem acesso (gratuito para essa turma)
  IF student_cohort_id IS NOT NULL AND (paid_cohorts IS NULL OR NOT (paid_cohorts @> ARRAY[student_cohort_id])) THEN
    RETURN true;
  END IF;
  
  -- Verificar acesso individual
  IF EXISTS (
    SELECT 1 FROM module_student_access
    WHERE module_id = _module_id
    AND student_email = _student_email
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;