
-- Remover a constraint antiga que usa user_id (conflita com a nova baseada em email)
ALTER TABLE lesson_progress 
DROP CONSTRAINT IF EXISTS lesson_progress_user_id_lesson_id_key;

-- Confirmar que apenas a constraint baseada em email permanece
-- A constraint unique_lesson_progress_email_lesson_area já existe e está correta
