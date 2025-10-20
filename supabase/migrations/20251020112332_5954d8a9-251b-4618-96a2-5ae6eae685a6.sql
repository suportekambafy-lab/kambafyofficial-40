-- Reverter para a política RLS original que funcionava
-- Esta migração desfaz as alterações que causaram o problema de "0 aulas"

DROP POLICY IF EXISTS "Students can view published lessons" ON public.lessons;

-- Restaurar política original que verifica acesso correto a módulos
CREATE POLICY "Students can view published lessons" 
ON public.lessons 
FOR SELECT 
USING (
  status = 'published' 
  AND (
    -- Proprietário tem acesso total
    EXISTS (
      SELECT 1 FROM member_areas ma 
      WHERE ma.id = lessons.member_area_id 
      AND ma.user_id = auth.uid()
    )
    OR
    -- Estudante registrado na área
    (
      EXISTS (
        SELECT 1 FROM member_area_students mas 
        WHERE mas.member_area_id = lessons.member_area_id 
        AND mas.student_email = get_current_user_email()
      )
      AND (
        -- Aula sem módulo (sempre acessível)
        lessons.module_id IS NULL
        OR
        -- Módulo não é pago (acessível para todos os estudantes)
        EXISTS (
          SELECT 1 FROM modules m
          WHERE m.id = lessons.module_id
          AND (m.is_paid IS NULL OR m.is_paid = false)
        )
        OR
        -- Estudante tem acesso individual ao módulo pago
        EXISTS (
          SELECT 1 FROM module_student_access msa
          WHERE msa.module_id = lessons.module_id
          AND msa.student_email = get_current_user_email()
        )
      )
    )
    OR
    -- Sessão ativa na área
    (
      EXISTS (
        SELECT 1 FROM member_area_sessions sess 
        WHERE sess.member_area_id = lessons.member_area_id 
        AND sess.student_email = get_current_user_email() 
        AND sess.expires_at > now()
      )
      AND (
        -- Aula sem módulo (sempre acessível)
        lessons.module_id IS NULL
        OR
        -- Módulo não é pago (acessível para todos)
        EXISTS (
          SELECT 1 FROM modules m
          WHERE m.id = lessons.module_id
          AND (m.is_paid IS NULL OR m.is_paid = false)
        )
        OR
        -- Estudante tem acesso individual ao módulo pago
        EXISTS (
          SELECT 1 FROM module_student_access msa
          WHERE msa.module_id = lessons.module_id
          AND msa.student_email = get_current_user_email()
        )
      )
    )
  )
);