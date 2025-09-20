-- Adicionar políticas RLS para permitir acesso de estudantes às áreas de membros

-- Política para permitir que qualquer pessoa veja member_areas (para login)
CREATE POLICY "Public can view member areas for access" 
ON public.member_areas 
FOR SELECT 
USING (true);

-- Política para permitir que qualquer pessoa veja lessons de áreas de membros
CREATE POLICY "Public can view lessons from member areas" 
ON public.lessons 
FOR SELECT 
USING (status = 'published');

-- Política para permitir que qualquer pessoa veja modules de áreas de membros
CREATE POLICY "Public can view modules from member areas" 
ON public.modules 
FOR SELECT 
USING (status = 'published');

-- Política para permitir que estudantes vejam comentários em lições que têm acesso
CREATE POLICY "Students can view comments on accessible lessons" 
ON public.lesson_comments 
FOR SELECT 
USING (true);

-- Política para permitir que estudantes criem comentários (usando email da sessão)
CREATE POLICY "Students can create comments with session" 
ON public.lesson_comments 
FOR INSERT 
WITH CHECK (true);