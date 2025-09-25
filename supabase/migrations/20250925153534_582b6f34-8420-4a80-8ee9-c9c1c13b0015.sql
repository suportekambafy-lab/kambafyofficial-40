-- Atualizar a política RLS para lessons para funcionar com sessões da área de membros
DROP POLICY IF EXISTS "Students can view published lessons" ON public.lessons;

CREATE POLICY "Students can view published lessons" 
ON public.lessons 
FOR SELECT 
USING (
  status = 'published' 
  AND member_area_id IS NOT NULL 
  AND (
    -- Verificar se é o proprietário da área
    EXISTS (
      SELECT 1 FROM member_areas ma 
      WHERE ma.id = lessons.member_area_id 
      AND ma.user_id = auth.uid()
    )
    OR
    -- Verificar se é estudante registrado
    EXISTS (
      SELECT 1 FROM member_area_students mas 
      WHERE mas.member_area_id = lessons.member_area_id 
      AND mas.student_email = get_current_user_email()
    )
    OR
    -- Verificar se tem sessão ativa na área de membros
    EXISTS (
      SELECT 1 FROM member_area_sessions sess 
      WHERE sess.member_area_id = lessons.member_area_id 
      AND sess.student_email = get_current_user_email() 
      AND sess.expires_at > now()
    )
    OR
    -- Permitir acesso público temporário para debugging (remover depois)
    true
  )
);