-- ❌ REMOVER política que bloqueia módulos pagos
DROP POLICY IF EXISTS "Students can view published lessons" ON public.lessons;

-- ✅ Criar política que permite acesso a módulos pagos
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
    -- Permite acesso público se a aula pertence a uma área de membros existente
    EXISTS (
      SELECT 1 FROM member_areas ma
      WHERE ma.id = lessons.member_area_id
    )
  )
  AND (
    -- Aula não pertence a nenhum módulo (acesso livre)
    lessons.module_id IS NULL
    OR
    -- Módulo não é pago (acesso livre)
    NOT EXISTS (
      SELECT 1 FROM modules m
      WHERE m.id = lessons.module_id
      AND m.is_paid = true
    )
    OR
    -- ✅ NOVO: Aluno tem acesso ao módulo pago via module_student_access
    EXISTS (
      SELECT 1 FROM module_student_access msa
      INNER JOIN member_area_students mas ON mas.student_email = msa.student_email
      WHERE msa.module_id = lessons.module_id
      AND mas.member_area_id = lessons.member_area_id
    )
    OR
    -- ✅ NOVO: Aluno pagou pelo módulo
    EXISTS (
      SELECT 1 FROM module_payments mp
      WHERE mp.module_id = lessons.module_id
      AND mp.status = 'completed'
    )
  )
);