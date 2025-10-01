-- Adicionar coluna user_email na tabela lesson_progress para usuários não autenticados
ALTER TABLE public.lesson_progress 
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Criar índice para melhorar performance de buscas por email
CREATE INDEX IF NOT EXISTS idx_lesson_progress_email 
ON public.lesson_progress(user_email);

-- Criar índice composto para buscar progresso por email e member_area_id
CREATE INDEX IF NOT EXISTS idx_lesson_progress_email_area 
ON public.lesson_progress(user_email, member_area_id);

-- Atualizar política RLS para permitir usuários não autenticados verem seu progresso por email
DROP POLICY IF EXISTS "Users can view their own lesson progress" ON public.lesson_progress;

CREATE POLICY "Users can view their own lesson progress" 
ON public.lesson_progress 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR user_email = get_current_user_email()
  OR (user_email IS NOT NULL AND user_email = current_setting('app.current_student_email', true))
);

-- Atualizar política para permitir inserção por email
DROP POLICY IF EXISTS "Users can create their own lesson progress" ON public.lesson_progress;

CREATE POLICY "Users can create their own lesson progress" 
ON public.lesson_progress 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  OR (user_email IS NOT NULL AND (
    user_email = get_current_user_email() 
    OR user_email = current_setting('app.current_student_email', true)
  ))
);

-- Atualizar política para permitir updates por email
DROP POLICY IF EXISTS "Users can update their own lesson progress" ON public.lesson_progress;

CREATE POLICY "Users can update their own lesson progress" 
ON public.lesson_progress 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR user_email = get_current_user_email()
  OR (user_email IS NOT NULL AND user_email = current_setting('app.current_student_email', true))
);

-- Atualizar política para permitir deleção por email
DROP POLICY IF EXISTS "Users can delete their own lesson progress" ON public.lesson_progress;

CREATE POLICY "Users can delete their own lesson progress" 
ON public.lesson_progress 
FOR DELETE 
USING (
  auth.uid() = user_id 
  OR user_email = get_current_user_email()
  OR (user_email IS NOT NULL AND user_email = current_setting('app.current_student_email', true))
);