-- Remover política com erro de permissão
DROP POLICY IF EXISTS "Students can view accessible lessons" ON public.lessons;

-- Criar política corrigida usando get_current_user_email()
CREATE POLICY "Students can view accessible lessons"
ON public.lessons
FOR SELECT
USING (
  status = 'published'
  AND (
    -- 1. Proprietário pode ver tudo
    EXISTS (
      SELECT 1 FROM member_areas ma
      WHERE ma.id = lessons.member_area_id
      AND ma.user_id = auth.uid()
    )
    
    -- 2. Aluno autenticado (Supabase Auth)
    OR (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 
        FROM member_area_students mas
        WHERE mas.member_area_id = lessons.member_area_id
        AND mas.student_email = get_current_user_email()
      )
      AND (
        -- Sem módulo (aula direta na área)
        lessons.module_id IS NULL
        
        -- OU módulo não-pago
        OR EXISTS (
          SELECT 1 FROM modules m
          WHERE m.id = lessons.module_id
          AND (m.is_paid = false OR m.is_paid IS NULL)
        )
        
        -- OU módulo pago MAS aluno NÃO na lista de turmas pagas
        OR EXISTS (
          SELECT 1 
          FROM modules m
          JOIN member_area_students mas ON mas.member_area_id = lessons.member_area_id
          WHERE m.id = lessons.module_id
          AND m.is_paid = true
          AND mas.student_email = get_current_user_email()
          AND (
            m.paid_cohort_ids IS NULL 
            OR NOT (m.paid_cohort_ids @> ARRAY[mas.cohort_id])
          )
        )
        
        -- OU acesso individual
        OR EXISTS (
          SELECT 1 FROM module_student_access msa
          WHERE msa.module_id = lessons.module_id
          AND msa.student_email = get_current_user_email()
        )
      )
    )
    
    -- 3. Sessão de membro ativa (login sem Supabase Auth)
    OR EXISTS (
      SELECT 1 
      FROM member_area_sessions sess
      WHERE sess.member_area_id = lessons.member_area_id
      AND sess.expires_at > now()
      AND (
        -- Sem módulo
        lessons.module_id IS NULL
        
        -- OU módulo não-pago
        OR EXISTS (
          SELECT 1 FROM modules m
          WHERE m.id = lessons.module_id
          AND (m.is_paid = false OR m.is_paid IS NULL)
        )
        
        -- OU módulo pago MAS aluno NÃO na lista de turmas pagas
        OR EXISTS (
          SELECT 1 
          FROM modules m
          JOIN member_area_students mas ON mas.member_area_id = sess.member_area_id
          WHERE m.id = lessons.module_id
          AND m.is_paid = true
          AND mas.student_email = sess.student_email
          AND (
            m.paid_cohort_ids IS NULL 
            OR NOT (m.paid_cohort_ids @> ARRAY[mas.cohort_id])
          )
        )
        
        -- OU acesso individual
        OR EXISTS (
          SELECT 1 FROM module_student_access msa
          WHERE msa.module_id = lessons.module_id
          AND msa.student_email = sess.student_email
        )
      )
    )
  )
);