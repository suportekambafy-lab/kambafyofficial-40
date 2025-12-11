-- Allow service role to insert notifications (for triggers and edge functions)
DROP POLICY IF EXISTS "Service role can insert notifications" ON member_area_notifications;
CREATE POLICY "Service role can insert notifications" 
ON member_area_notifications FOR INSERT 
TO service_role
WITH CHECK (true);

-- Allow triggers to insert notifications
DROP POLICY IF EXISTS "Triggers can insert notifications" ON member_area_notifications;
CREATE POLICY "Triggers can insert notifications" 
ON member_area_notifications FOR INSERT 
WITH CHECK (true);

-- Insert test notifications
INSERT INTO member_area_notifications (member_area_id, student_email, type, title, message, data, read)
VALUES 
  ('71b6a9c3-3370-4fa0-b202-3ec3906a3848', 'validar@kambafy.com', 'tip', '💡 Dica de Concentração', 'Experimente a técnica Pomodoro: 25 minutos de foco, 5 de pausa. Repita 4 vezes e faça uma pausa maior!', '{"type": "tip"}', false),
  ('71b6a9c3-3370-4fa0-b202-3ec3906a3848', 'validar@kambafy.com', 'motivation', '🚀 Motivação do Dia', 'Cada aula que você completa é um passo mais perto do seu objetivo. Continue assim!', '{"type": "motivation"}', false),
  ('71b6a9c3-3370-4fa0-b202-3ec3906a3848', 'validar@kambafy.com', 'announcement', '📢 Bem-vindo ao Curso!', 'Estamos felizes em tê-lo conosco. Explore os módulos e comece sua jornada de aprendizado!', '{"type": "announcement"}', false);