-- Verificar e corrigir a política RLS para permitir que owners vejam a contagem de estudantes
-- Primeiro, vamos garantir que a política está correta

-- Drop políticas duplicadas que podem estar causando conflito
DROP POLICY IF EXISTS "Area owners can view their students" ON member_area_students;
DROP POLICY IF EXISTS "Owners can view their member area students" ON member_area_students;

-- Criar uma política única e clara para owners verem seus estudantes
CREATE POLICY "Area owners can view their students" 
ON member_area_students 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM member_areas ma 
    WHERE ma.id = member_area_students.member_area_id 
    AND ma.user_id = auth.uid()
  )
);