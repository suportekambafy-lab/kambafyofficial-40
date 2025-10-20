-- REVERTER política insegura e implementar solução correta
-- Problema: Sessão expirada + política precisa do email do aluno

DROP POLICY IF EXISTS "Students can view published lessons" ON public.lessons;

-- Política segura que verifica o email do aluno diretamente
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
    -- Estudante registrado COM email verificável
    (
      -- Verifica se há um estudante registrado
      EXISTS (
        SELECT 1 FROM member_area_students mas 
        WHERE mas.member_area_id = lessons.member_area_id 
        AND (
          -- Se autenticado, usar email do auth
          (auth.uid() IS NOT NULL AND mas.student_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
          ))
          OR
          -- Se não autenticado, verificar se há sessão ativa para este email
          (auth.uid() IS NULL AND EXISTS (
            SELECT 1 FROM member_area_sessions sess
            WHERE sess.member_area_id = lessons.member_area_id
            AND sess.student_email = mas.student_email
            AND sess.expires_at > NOW()
          ))
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
          INNER JOIN member_area_students mas2 ON mas2.student_email = msa.student_email
          WHERE msa.module_id = lessons.module_id
          AND mas2.member_area_id = lessons.member_area_id
          AND (
            (auth.uid() IS NOT NULL AND mas2.student_email = (
              SELECT email FROM auth.users WHERE id = auth.uid()
            ))
            OR
            (auth.uid() IS NULL AND EXISTS (
              SELECT 1 FROM member_area_sessions sess
              WHERE sess.student_email = mas2.student_email
              AND sess.expires_at > NOW()
            ))
          )
        )
      )
    )
  )
);