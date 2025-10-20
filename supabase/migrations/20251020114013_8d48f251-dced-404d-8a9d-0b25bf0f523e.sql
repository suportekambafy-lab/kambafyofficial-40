-- ❌ REMOVER política problemática que acessa auth.users
DROP POLICY IF EXISTS "Students can view published lessons" ON public.lessons;

-- ✅ Criar política simplificada para estudantes (sem acesso a auth.users)
CREATE POLICY "Students can view published lessons"
ON public.lessons
FOR SELECT
USING (
  status = 'published'
  AND (
    -- Owner tem acesso total
    EXISTS (
      SELECT 1 FROM member_areas ma
      WHERE ma.id = lessons.member_area_id
      AND ma.user_id = auth.uid()
    )
    OR
    -- Estudante autenticado registrado na área
    (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM member_area_students mas
        INNER JOIN profiles p ON p.email = mas.student_email
        WHERE mas.member_area_id = lessons.member_area_id
        AND p.user_id = auth.uid()
      )
    )
    OR
    -- Estudante com sessão válida (acesso via query params)
    EXISTS (
      SELECT 1 FROM member_area_sessions sess
      WHERE sess.member_area_id = lessons.member_area_id
      AND sess.expires_at > NOW()
      AND EXISTS (
        SELECT 1 FROM member_area_students mas2
        WHERE mas2.student_email = sess.student_email
        AND mas2.member_area_id = lessons.member_area_id
      )
    )
  )
  AND (
    -- Módulo é NULL (aula sem módulo)
    lessons.module_id IS NULL
    OR
    -- Módulo não é pago
    NOT EXISTS (
      SELECT 1 FROM modules m
      WHERE m.id = lessons.module_id
      AND m.is_paid = true
    )
    OR
    -- Estudante tem acesso individual ao módulo pago
    EXISTS (
      SELECT 1 FROM module_student_access msa
      INNER JOIN member_area_students mas ON mas.student_email = msa.student_email
      WHERE msa.module_id = lessons.module_id
      AND mas.member_area_id = lessons.member_area_id
      AND (
        (auth.uid() IS NOT NULL AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.user_id = auth.uid()
          AND p.email = mas.student_email
        ))
        OR
        (EXISTS (
          SELECT 1 FROM member_area_sessions sess
          WHERE sess.student_email = mas.student_email
          AND sess.expires_at > NOW()
        ))
      )
    )
  )
);