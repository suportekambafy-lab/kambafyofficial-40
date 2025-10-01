-- Adicionar constraint única para permitir upsert por email na tabela lesson_progress
-- Primeiro, remover duplicatas existentes se houver
DELETE FROM lesson_progress a USING lesson_progress b
WHERE a.id > b.id 
  AND a.user_email = b.user_email 
  AND a.lesson_id = b.lesson_id 
  AND a.member_area_id = b.member_area_id;

-- Criar constraint única para user_email + lesson_id + member_area_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_lesson_progress_email_lesson_area 
ON lesson_progress (user_email, lesson_id, member_area_id);

-- Adicionar constraint única
ALTER TABLE lesson_progress 
ADD CONSTRAINT unique_lesson_progress_email_lesson_area 
UNIQUE USING INDEX idx_lesson_progress_email_lesson_area;