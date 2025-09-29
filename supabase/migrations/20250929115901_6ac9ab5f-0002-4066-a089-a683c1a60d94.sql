-- Atualizar políticas RLS para lesson_comments para permitir eliminação por email
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.lesson_comments;

-- Criar política que permite eliminar comentários pelo email do usuário
CREATE POLICY "Students can delete their own comments by email" 
ON public.lesson_comments 
FOR DELETE 
USING (
  user_email = get_current_user_email() 
  OR 
  (user_email IS NOT NULL AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email = lesson_comments.user_email
  ))
);

-- Política adicional para permitir eliminação em sessões de áreas de membros
CREATE POLICY "Member area students can delete comments" 
ON public.lesson_comments 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM member_area_sessions sess
    WHERE sess.student_email = lesson_comments.user_email
    AND sess.expires_at > now()
  )
);