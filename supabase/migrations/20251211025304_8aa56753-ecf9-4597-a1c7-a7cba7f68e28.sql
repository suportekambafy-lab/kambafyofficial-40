-- Criar função para verificar se o usuário é dono da área de membros
CREATE OR REPLACE FUNCTION public.is_member_area_owner(area_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM member_areas 
    WHERE id = area_id AND user_id = auth.uid()
  );
END;
$$;

-- Adicionar política para donos da área verem seus estudantes (usando auth.uid direto)
DROP POLICY IF EXISTS "Area owners can view their students" ON public.member_area_students;

CREATE POLICY "Area owners can view their students" 
ON public.member_area_students 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM member_areas ma 
    WHERE ma.id = member_area_students.member_area_id 
    AND ma.user_id = auth.uid()
  )
);

-- Política adicional para o service role poder gerenciar todos os estudantes
CREATE POLICY "Service role can manage all students"
ON public.member_area_students
FOR ALL
USING (true)
WITH CHECK (true);