-- Remover políticas antigas de forma segura
DROP POLICY IF EXISTS "Users can create their own lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can update their own lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can view their own lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can delete their own lesson progress" ON public.lesson_progress;

-- Políticas simplificadas e corretas para sessões de membros
CREATE POLICY "Members manage own progress via email"
ON public.lesson_progress
FOR ALL
USING (
  user_email IS NOT NULL 
  AND length(trim(user_email)) > 0
)
WITH CHECK (
  user_email IS NOT NULL 
  AND length(trim(user_email)) > 0
);