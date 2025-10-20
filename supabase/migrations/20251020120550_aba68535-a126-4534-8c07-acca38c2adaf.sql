-- ❌ REMOVER política que permite acesso indevido a módulos pagos
DROP POLICY IF EXISTS "Students can view published lessons" ON public.lessons;

-- ✅ CRIAR política correta que bloqueia módulos pagos sem pagamento
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
    -- Estudante autenticado via Supabase Auth
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
    -- Estudante com sessão válida (login via email)
    EXISTS (
      SELECT 1 FROM member_area_sessions sess
      WHERE sess.member_area_id = lessons.member_area_id
      AND sess.expires_at > NOW()
      AND EXISTS (
        SELECT 1 FROM member_area_students mas
        WHERE mas.student_email = sess.student_email
        AND mas.member_area_id = lessons.member_area_id
      )
    )
  )
  AND (
    -- ✅ CONTROLE DE ACESSO A MÓDULOS PAGOS
    -- Aula sem módulo (acesso livre)
    lessons.module_id IS NULL
    OR
    -- Módulo gratuito (acesso livre)
    NOT EXISTS (
      SELECT 1 FROM modules m
      WHERE m.id = lessons.module_id
      AND m.is_paid = true
    )
    OR
    -- ✅ MÓDULO PAGO: Aluno tem acesso via module_student_access
    EXISTS (
      SELECT 1 FROM module_student_access msa
      INNER JOIN member_area_students mas ON mas.student_email = msa.student_email
      WHERE msa.module_id = lessons.module_id
      AND mas.member_area_id = lessons.member_area_id
    )
    OR
    -- ✅ MÓDULO PAGO: Aluno pagou via module_payments (auth)
    (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM module_payments mp
        INNER JOIN profiles p ON p.email = mp.student_email
        WHERE mp.module_id = lessons.module_id
        AND mp.status = 'completed'
        AND p.user_id = auth.uid()
      )
    )
    OR
    -- ✅ MÓDULO PAGO: Aluno pagou via module_payments (sessão)
    EXISTS (
      SELECT 1 FROM module_payments mp
      INNER JOIN member_area_sessions sess ON sess.student_email = mp.student_email
      WHERE mp.module_id = lessons.module_id
      AND mp.status = 'completed'
      AND sess.expires_at > NOW()
      AND sess.member_area_id = lessons.member_area_id
    )
  )
);