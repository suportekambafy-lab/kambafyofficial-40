-- Solução: Permitir acesso às aulas via sessões ativas SEM necessidade de auth.uid()
-- Isso corrige o problema de "0 aulas" para estudantes com acesso verificado via query params

DROP POLICY IF EXISTS "Students can view published lessons" ON public.lessons;

CREATE POLICY "Students can view published lessons" 
ON public.lessons 
FOR SELECT 
USING (
  status = 'published' 
  AND (
    -- ✅ 1. Proprietário tem acesso total
    EXISTS (
      SELECT 1 FROM member_areas ma 
      WHERE ma.id = lessons.member_area_id 
      AND ma.user_id = auth.uid()
    )
    OR
    -- ✅ 2. Estudante autenticado via Supabase Auth
    (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM member_area_students mas 
        WHERE mas.member_area_id = lessons.member_area_id 
        AND mas.student_email = (
          SELECT email FROM auth.users WHERE id = auth.uid()
        )
      )
      AND (
        -- Aula sem módulo (sempre acessível)
        lessons.module_id IS NULL
        OR
        -- Módulo não é pago
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
          AND msa.student_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
          )
        )
      )
    )
    OR
    -- ✅ 3. NOVO: Sessão ativa SEM AUTH (via query params verificados)
    -- Permite acesso anônimo se há sessão ativa válida
    (
      auth.uid() IS NULL
      AND EXISTS (
        SELECT 1 FROM member_area_sessions sess
        WHERE sess.member_area_id = lessons.member_area_id
        AND sess.expires_at > NOW()
        AND sess.student_email IS NOT NULL
      )
    )
  )
);