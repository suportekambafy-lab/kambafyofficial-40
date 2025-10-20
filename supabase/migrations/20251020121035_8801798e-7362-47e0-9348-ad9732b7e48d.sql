-- ✅ Corrigir política: owner deve ver TODAS as aulas, inclusive de módulos pagos
DROP POLICY IF EXISTS "Students can view published lessons" ON public.lessons;

CREATE POLICY "Students can view published lessons"
ON public.lessons
FOR SELECT
USING (
  status = 'published'
  AND (
    -- Owner tem acesso TOTAL a TODAS as aulas (inclusive módulos pagos)
    EXISTS (
      SELECT 1 FROM member_areas ma
      WHERE ma.id = lessons.member_area_id
      AND ma.user_id = auth.uid()
    )
    OR
    (
      -- Para não-owners: permitir aulas não-pagas OU aulas pagas com acesso individual
      (
        lessons.module_id IS NULL
        OR
        NOT EXISTS (
          SELECT 1 FROM modules m
          WHERE m.id = lessons.module_id
          AND m.is_paid = true
        )
      )
      AND (
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
        -- Acesso público se pertence a uma área existente
        EXISTS (
          SELECT 1 FROM member_areas ma
          WHERE ma.id = lessons.member_area_id
        )
      )
    )
  )
);