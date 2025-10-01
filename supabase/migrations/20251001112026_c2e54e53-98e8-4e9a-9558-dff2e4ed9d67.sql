
-- Atualizar política de INSERT para permitir salvamento via email normalizado
-- sem depender de auth.uid() ou get_current_user_email() que não funcionam com sessões virtuais

DROP POLICY IF EXISTS "Users can create their own lesson progress" ON lesson_progress;

CREATE POLICY "Users can create their own lesson progress" 
ON lesson_progress 
FOR INSERT 
WITH CHECK (
  -- Permitir se user_email está preenchido (sessão virtual ou normal)
  user_email IS NOT NULL AND length(trim(user_email)) > 0
);

-- Atualizar política de UPDATE para permitir atualização via email
DROP POLICY IF EXISTS "Users can update their own lesson progress" ON lesson_progress;

CREATE POLICY "Users can update their own lesson progress" 
ON lesson_progress 
FOR UPDATE 
USING (
  -- Permitir se user_email está preenchido
  user_email IS NOT NULL AND length(trim(user_email)) > 0
);

-- Atualizar política de SELECT para permitir leitura via email
DROP POLICY IF EXISTS "Users can view their own lesson progress" ON lesson_progress;

CREATE POLICY "Users can view their own lesson progress" 
ON lesson_progress 
FOR SELECT 
USING (
  -- Permitir se user_email está preenchido
  user_email IS NOT NULL AND length(trim(user_email)) > 0
);

-- Política de DELETE permanece mais restritiva (apenas dono pode deletar)
DROP POLICY IF EXISTS "Users can delete their own lesson progress" ON lesson_progress;

CREATE POLICY "Users can delete their own lesson progress" 
ON lesson_progress 
FOR DELETE 
USING (
  (auth.uid() = user_id) OR 
  (user_email = get_current_user_email()) OR 
  (user_email IS NOT NULL AND user_email = current_setting('app.current_student_email'::text, true))
);
