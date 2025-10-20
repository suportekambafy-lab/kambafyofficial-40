-- ✅ SOLUÇÃO FINAL: Permitir VER todas as aulas para alunos registrados
-- O bloqueio de CONTEÚDO de módulos pagos fica no frontend

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
    -- ✅ Estudante registrado na área pode VER TODAS as aulas
    (
      EXISTS (
        SELECT 1 FROM member_area_students mas 
        WHERE mas.member_area_id = lessons.member_area_id 
        AND mas.student_email = get_current_user_email()
      )
    )
    OR
    -- ✅ Sessão ativa na área pode VER TODAS as aulas
    (
      EXISTS (
        SELECT 1 FROM member_area_sessions sess 
        WHERE sess.member_area_id = lessons.member_area_id 
        AND sess.student_email = get_current_user_email() 
        AND sess.expires_at > now()
      )
    )
  )
);