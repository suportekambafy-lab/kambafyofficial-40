-- Corrigir políticas RLS para permitir comentários de estudantes de área de membros sem auth.uid()

-- Remover a política restritiva que exige auth.uid()
DROP POLICY IF EXISTS "Students can create comments on lessons they have access to" ON public.lesson_comments;

-- Criar nova política que permite comentários via sessão de área de membros ou autenticação normal
CREATE POLICY "Students can create comments with member session or auth" 
ON public.lesson_comments 
FOR INSERT 
WITH CHECK (
  -- Permitir se for via sessão de área de membros válida
  (user_email IS NOT NULL AND EXISTS (
    SELECT 1 FROM member_area_sessions sess
    WHERE sess.student_email = user_email
    AND sess.expires_at > now()
  ))
  OR
  -- Permitir se for usuário autenticado normalmente
  (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM ((lessons l
      JOIN member_areas ma ON (l.member_area_id = ma.id))
      JOIN member_area_students mas ON (ma.id = mas.member_area_id))
    WHERE l.id = lesson_id 
    AND (mas.student_email = get_current_user_email() OR ma.user_id = auth.uid())
  ))
);

-- Atualizar política de UPDATE para incluir estudantes de área de membros
DROP POLICY IF EXISTS "Users can update their own comments" ON public.lesson_comments;

CREATE POLICY "Students can update their own comments" 
ON public.lesson_comments 
FOR UPDATE 
USING (
  -- Usuário autenticado normal
  (auth.uid() = user_id) 
  OR 
  -- Estudante de área de membros com sessão válida
  (user_email IS NOT NULL AND EXISTS (
    SELECT 1 FROM member_area_sessions sess
    WHERE sess.student_email = user_email
    AND sess.expires_at > now()
  ))
);