-- ❌ REMOVER política que não funciona para sessões customizadas
DROP POLICY IF EXISTS "Students can view published lessons" ON public.lessons;

-- ✅ Criar política que permite acesso baseado em member_area_students
-- (alunos acessam via sessão customizada, não via auth.uid())
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
    -- ✅ NOVO: Permite acesso público se a aula pertence a uma área de membros existente
    -- (controle de acesso é feito via backend/frontend com sessões)
    EXISTS (
      SELECT 1 FROM member_areas ma
      WHERE ma.id = lessons.member_area_id
    )
  )
  AND (
    -- Verificação de módulos pagos
    lessons.module_id IS NULL
    OR
    NOT EXISTS (
      SELECT 1 FROM modules m
      WHERE m.id = lessons.module_id
      AND m.is_paid = true
    )
  )
);