-- ✅ Adicionar política para vendedores gerenciarem suas próprias aulas
-- Esta política permite SELECT, INSERT, UPDATE, DELETE para o proprietário

CREATE POLICY "Owners can manage their own lessons"
ON public.lessons
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ✅ A política "Students can view published lessons" continua existindo
-- Ela permite que estudantes vejam apenas aulas publicadas
-- Agora temos DUAS políticas: uma para owners, outra para students