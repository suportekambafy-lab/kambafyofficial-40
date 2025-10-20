-- ✅ CORREÇÃO DEFINITIVA: RLS para lessons com suporte a sessões virtuais
-- Permitir acesso público a lessons de módulos não pagos
-- Bloquear apenas módulos pagos sem acesso

DROP POLICY IF EXISTS "Students can view published lessons" ON public.lessons;

CREATE POLICY "Students can view published lessons" 
ON public.lessons 
FOR SELECT 
USING (
  status = 'published' 
  AND (
    -- ✅ Proprietário tem acesso total (autenticado)
    EXISTS (
      SELECT 1 FROM member_areas ma 
      WHERE ma.id = lessons.member_area_id 
      AND ma.user_id = auth.uid()
    )
    OR
    -- ✅ Lesson sem módulo - ACESSO PÚBLICO
    lessons.module_id IS NULL
    OR
    -- ✅ Lesson com módulo NÃO pago - ACESSO PÚBLICO
    EXISTS (
      SELECT 1 FROM modules m 
      WHERE m.id = lessons.module_id 
      AND (m.is_paid IS NULL OR m.is_paid = false)
    )
    OR
    -- ✅ Lesson com módulo pago - verificar acesso do estudante autenticado
    (
      EXISTS (
        SELECT 1 FROM modules m 
        WHERE m.id = lessons.module_id 
        AND m.is_paid = true
      )
      AND EXISTS (
        SELECT 1 FROM module_student_access msa
        WHERE msa.module_id = lessons.module_id
        AND msa.student_email = get_current_user_email()
      )
    )
  )
);