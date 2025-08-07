
-- Primeiro, vamos remover as políticas duplicadas e criar uma versão corrigida
DROP POLICY IF EXISTS "Students can create comments on lessons they have access to" ON public.lesson_comments;
DROP POLICY IF EXISTS "Students can view comments on lessons they have access to" ON public.lesson_comments;
DROP POLICY IF EXISTS "Users can create comments on lessons they have access to" ON public.lesson_comments;
DROP POLICY IF EXISTS "Users can view comments on lessons they have access to" ON public.lesson_comments;

-- Criar políticas mais simples e funcionais para comentários
-- Permitir que usuários autenticados vejam comentários de aulas publicadas
CREATE POLICY "Authenticated users can view comments on published lessons" 
  ON public.lesson_comments 
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.id = lesson_comments.lesson_id 
      AND l.status = 'published'
    )
  );

-- Permitir que usuários autenticados criem comentários em aulas publicadas
CREATE POLICY "Authenticated users can create comments on published lessons" 
  ON public.lesson_comments 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.id = lesson_comments.lesson_id 
      AND l.status = 'published'
    )
  );

-- Permitir que usuários editem seus próprios comentários
CREATE POLICY "Users can update their own comments" 
  ON public.lesson_comments 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Permitir que usuários deletem seus próprios comentários
CREATE POLICY "Users can delete their own comments" 
  ON public.lesson_comments 
  FOR DELETE 
  USING (auth.uid() = user_id);
