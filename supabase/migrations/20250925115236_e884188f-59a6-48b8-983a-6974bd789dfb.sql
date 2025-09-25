-- Remover políticas RLS existentes da tabela lessons
DROP POLICY IF EXISTS "Secure lesson access for creators and authorized students" ON public.lessons;
DROP POLICY IF EXISTS "Users can view their own lessons" ON public.lessons;
DROP POLICY IF EXISTS "Users can create their own lessons" ON public.lessons;
DROP POLICY IF EXISTS "Users can update their own lessons" ON public.lessons;
DROP POLICY IF EXISTS "Users can delete their own lessons" ON public.lessons;

-- Criar políticas RLS simplificadas e funcionais
CREATE POLICY "Users can manage their own lessons" ON public.lessons
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política para estudantes verem lessons published das áreas que têm acesso
CREATE POLICY "Students can view published lessons" ON public.lessons
FOR SELECT USING (
  status = 'published' 
  AND member_area_id IS NOT NULL 
  AND (
    -- Estudante registrado na área de membros
    EXISTS (
      SELECT 1 FROM public.member_area_students mas
      WHERE mas.member_area_id = lessons.member_area_id
      AND mas.student_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
    OR
    -- Sessão ativa na área de membros
    EXISTS (
      SELECT 1 FROM public.member_area_sessions sess
      WHERE sess.member_area_id = lessons.member_area_id
      AND sess.student_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
      AND sess.expires_at > now()
    )
  )
);