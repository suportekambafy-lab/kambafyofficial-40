-- Permitir que donos de área de membros gerenciem todos os comentários
CREATE POLICY "Area owners can manage all comments in their area" 
ON public.lesson_comments 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM lessons l
    JOIN member_areas ma ON l.member_area_id = ma.id
    WHERE l.id = lesson_comments.lesson_id 
    AND ma.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM lessons l
    JOIN member_areas ma ON l.member_area_id = ma.id
    WHERE l.id = lesson_comments.lesson_id 
    AND ma.user_id = auth.uid()
  )
);