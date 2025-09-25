-- Verificar e corrigir políticas RLS para member_area_students
-- Permitir acesso público para verificação de estudantes durante login

-- Remover política restritiva existente se houver
DROP POLICY IF EXISTS "Area owners can manage their students" ON public.member_area_students;

-- Criar política mais permissiva para permitir verificação durante login
CREATE POLICY "Public can verify student access for login" 
ON public.member_area_students 
FOR SELECT 
USING (true);

-- Criar política para que donos das áreas possam gerenciar estudantes
CREATE POLICY "Area owners can manage their students" 
ON public.member_area_students 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.member_areas 
  WHERE member_areas.id = member_area_students.member_area_id 
  AND member_areas.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.member_areas 
  WHERE member_areas.id = member_area_students.member_area_id 
  AND member_areas.user_id = auth.uid()
));

-- Permitir inserção pelo sistema para novos estudantes
CREATE POLICY "System can add students" 
ON public.member_area_students 
FOR INSERT 
WITH CHECK (true);