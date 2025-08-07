
-- Permitir que estudantes comentem nas aulas (eles precisam ter acesso à área de membros)
CREATE POLICY "Students can create comments on lessons they have access to" 
  ON public.lesson_comments 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND (
      EXISTS (
        SELECT 1 FROM lessons l
        JOIN member_areas ma ON l.member_area_id = ma.id
        JOIN member_area_students mas ON ma.id = mas.member_area_id
        WHERE l.id = lesson_comments.lesson_id 
        AND mas.student_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      ) OR
      EXISTS (
        SELECT 1 FROM lessons l
        JOIN member_areas ma ON l.member_area_id = ma.id
        WHERE l.id = lesson_comments.lesson_id 
        AND ma.user_id = auth.uid()
      )
    )
  );

-- Permitir que estudantes vejam comentários das aulas que têm acesso
CREATE POLICY "Students can view comments on lessons they have access to" 
  ON public.lesson_comments 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN member_areas ma ON l.member_area_id = ma.id
      JOIN member_area_students mas ON ma.id = mas.member_area_id
      WHERE l.id = lesson_comments.lesson_id 
      AND mas.student_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN member_areas ma ON l.member_area_id = ma.id
      WHERE l.id = lesson_comments.lesson_id 
      AND ma.user_id = auth.uid()
    )
  );
