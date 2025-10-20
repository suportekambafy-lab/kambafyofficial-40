-- ✅ CORREÇÃO CRÍTICA DE SEGURANÇA: RLS para lessons com verificação de módulos pagos
-- Remove acesso público e adiciona verificação para módulos pagos

DROP POLICY IF EXISTS "Students can view published lessons" ON public.lessons;

CREATE POLICY "Students can view published lessons" 
ON public.lessons 
FOR SELECT 
USING (
  status = 'published' 
  AND member_area_id IS NOT NULL 
  AND (
    -- ✅ Verificar se é o proprietário da área (criador tem acesso total)
    EXISTS (
      SELECT 1 FROM member_areas ma 
      WHERE ma.id = lessons.member_area_id 
      AND ma.user_id = auth.uid()
    )
    OR
    -- ✅ Verificar se é estudante registrado E tem acesso ao módulo (se for pago)
    (
      EXISTS (
        SELECT 1 FROM member_area_students mas 
        WHERE mas.member_area_id = lessons.member_area_id 
        AND mas.student_email = get_current_user_email()
      )
      AND
      (
        -- Se a aula NÃO tem módulo, liberar
        lessons.module_id IS NULL
        OR
        -- Se a aula tem módulo, verificar se é pago
        EXISTS (
          SELECT 1 FROM modules m
          WHERE m.id = lessons.module_id
          AND (
            -- Se NÃO é pago, liberar
            m.is_paid = false OR m.is_paid IS NULL
            OR
            -- Se é pago, verificar se tem acesso individual
            EXISTS (
              SELECT 1 FROM module_student_access msa
              WHERE msa.module_id = m.id
              AND msa.student_email = get_current_user_email()
            )
          )
        )
      )
    )
    OR
    -- ✅ Verificar se tem sessão ativa E tem acesso ao módulo (se for pago)
    (
      EXISTS (
        SELECT 1 FROM member_area_sessions sess 
        WHERE sess.member_area_id = lessons.member_area_id 
        AND sess.student_email = get_current_user_email() 
        AND sess.expires_at > now()
      )
      AND
      (
        -- Se a aula NÃO tem módulo, liberar
        lessons.module_id IS NULL
        OR
        -- Se a aula tem módulo, verificar se é pago
        EXISTS (
          SELECT 1 FROM modules m
          WHERE m.id = lessons.module_id
          AND (
            -- Se NÃO é pago, liberar
            m.is_paid = false OR m.is_paid IS NULL
            OR
            -- Se é pago, verificar se tem acesso individual
            EXISTS (
              SELECT 1 FROM module_student_access msa
              WHERE msa.module_id = m.id
              AND msa.student_email = get_current_user_email()
            )
          )
        )
      )
    )
  )
);