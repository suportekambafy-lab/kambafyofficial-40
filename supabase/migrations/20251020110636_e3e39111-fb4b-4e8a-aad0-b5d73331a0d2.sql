-- ✅ CORREÇÃO FINAL: RLS simplificada para lessons
-- Mostrar aulas normalmente e bloquear APENAS módulos pagos sem acesso

DROP POLICY IF EXISTS "Students can view published lessons" ON public.lessons;

CREATE POLICY "Students can view published lessons" 
ON public.lessons 
FOR SELECT 
USING (
  status = 'published' 
  AND (
    -- ✅ Proprietário tem acesso total
    EXISTS (
      SELECT 1 FROM member_areas ma 
      WHERE ma.id = lessons.member_area_id 
      AND ma.user_id = auth.uid()
    )
    OR
    -- ✅ Estudante registrado na área
    (
      EXISTS (
        SELECT 1 FROM member_area_students mas 
        WHERE mas.member_area_id = lessons.member_area_id 
        AND mas.student_email = get_current_user_email()
      )
      AND (
        -- Se não tem módulo, liberar
        lessons.module_id IS NULL
        OR
        -- Se tem módulo mas não é pago, liberar
        EXISTS (
          SELECT 1 FROM modules m 
          WHERE m.id = lessons.module_id 
          AND (m.is_paid IS NULL OR m.is_paid = false)
        )
        OR
        -- Se módulo é pago, verificar acesso
        EXISTS (
          SELECT 1 FROM module_student_access msa
          WHERE msa.module_id = lessons.module_id
          AND msa.student_email = get_current_user_email()
        )
      )
    )
    OR
    -- ✅ Sessão ativa na área
    (
      EXISTS (
        SELECT 1 FROM member_area_sessions sess 
        WHERE sess.member_area_id = lessons.member_area_id 
        AND sess.student_email = get_current_user_email() 
        AND sess.expires_at > now()
      )
      AND (
        -- Se não tem módulo, liberar
        lessons.module_id IS NULL
        OR
        -- Se tem módulo mas não é pago, liberar
        EXISTS (
          SELECT 1 FROM modules m 
          WHERE m.id = lessons.module_id 
          AND (m.is_paid IS NULL OR m.is_paid = false)
        )
        OR
        -- Se módulo é pago, verificar acesso
        EXISTS (
          SELECT 1 FROM module_student_access msa
          WHERE msa.module_id = lessons.module_id
          AND msa.student_email = get_current_user_email()
        )
      )
    )
  )
);