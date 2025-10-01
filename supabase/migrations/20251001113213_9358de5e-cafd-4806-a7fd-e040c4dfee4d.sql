-- Criar constraint UNIQUE na tabela lesson_progress para permitir upserts baseados em email
-- Isso permite que o mesmo email salve progresso para a mesma aula na mesma área de membros

-- Primeiro, remover possíveis duplicatas existentes (manter apenas a mais recente)
DELETE FROM lesson_progress a
USING lesson_progress b
WHERE a.id < b.id
  AND a.user_email = b.user_email
  AND a.lesson_id = b.lesson_id
  AND a.member_area_id = b.member_area_id;

-- Criar a constraint UNIQUE
ALTER TABLE lesson_progress
ADD CONSTRAINT lesson_progress_user_email_lesson_member_unique 
UNIQUE (user_email, lesson_id, member_area_id);