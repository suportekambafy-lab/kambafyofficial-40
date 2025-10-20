-- ============================================
-- SIMPLIFICAÇÃO DAS POLÍTICAS RLS - LESSONS
-- ============================================

-- 1. REMOVER TODAS AS POLÍTICAS ATUAIS DA TABELA LESSONS
DROP POLICY IF EXISTS "Owners can manage their own lessons" ON public.lessons;
DROP POLICY IF EXISTS "Students can view accessible lessons" ON public.lessons;
DROP POLICY IF EXISTS "Students can view accessible lessons" ON public.lessons;
DROP POLICY IF EXISTS "Users can manage their own lessons" ON public.lessons;
DROP POLICY IF EXISTS "Validation email can view all lessons" ON public.lessons;

-- 2. CRIAR 3 POLÍTICAS SIMPLES E DIRETAS

-- Política 1: Donos podem gerenciar suas próprias aulas
CREATE POLICY "Owners can manage their own lessons"
ON public.lessons
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política 2: Estudantes podem ver aulas publicadas
CREATE POLICY "Students can view published lessons"
ON public.lessons
FOR SELECT
TO authenticated
USING (
  status = 'published' 
  AND (
    -- É o dono da aula
    auth.uid() = user_id
    OR
    -- É um estudante registrado na área de membros
    EXISTS (
      SELECT 1 FROM public.member_area_students
      WHERE member_area_id = lessons.member_area_id
      AND student_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    OR
    -- Tem uma sessão ativa (para login sem auth do Supabase)
    EXISTS (
      SELECT 1 FROM public.member_area_sessions
      WHERE member_area_id = lessons.member_area_id
      AND expires_at > now()
      AND student_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
);

-- Política 3: Email de validação do sistema pode ver tudo
CREATE POLICY "Validation email can view all lessons"
ON public.lessons
FOR SELECT
TO authenticated
USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'validar@kambafy.com'
);