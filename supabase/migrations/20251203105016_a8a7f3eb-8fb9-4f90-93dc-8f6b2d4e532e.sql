-- Criar tabela para notificações da área de membros (para alunos)
CREATE TABLE public.member_area_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_area_id UUID NOT NULL REFERENCES public.member_areas(id) ON DELETE CASCADE,
  student_email TEXT NOT NULL,
  type TEXT NOT NULL, -- 'mentor_reply', 'new_lesson', 'new_module', 'announcement'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX idx_member_area_notifications_student ON public.member_area_notifications(student_email, member_area_id);
CREATE INDEX idx_member_area_notifications_read ON public.member_area_notifications(student_email, read);
CREATE INDEX idx_member_area_notifications_created ON public.member_area_notifications(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.member_area_notifications ENABLE ROW LEVEL SECURITY;

-- Política para alunos lerem suas próprias notificações (via service role nas edge functions)
CREATE POLICY "Allow all operations via service role" 
ON public.member_area_notifications 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Habilitar realtime
ALTER TABLE public.member_area_notifications REPLICA IDENTITY FULL;

-- Adicionar à publicação realtime se existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.member_area_notifications;
  END IF;
END $$;

-- Criar função para criar notificação quando mentor responde comentário
CREATE OR REPLACE FUNCTION public.notify_student_on_mentor_reply()
RETURNS TRIGGER AS $$
DECLARE
  lesson_record RECORD;
  member_area_record RECORD;
  parent_comment_record RECORD;
BEGIN
  -- Só notifica se for uma resposta (tem parent_comment_id)
  IF NEW.parent_comment_id IS NOT NULL THEN
    -- Buscar o comentário pai
    SELECT * INTO parent_comment_record FROM public.lesson_comments WHERE id = NEW.parent_comment_id;
    
    IF parent_comment_record IS NOT NULL AND parent_comment_record.user_email IS NOT NULL THEN
      -- Buscar informações da aula
      SELECT * INTO lesson_record FROM public.lessons WHERE id = NEW.lesson_id;
      
      IF lesson_record IS NOT NULL AND lesson_record.member_area_id IS NOT NULL THEN
        -- Buscar informações da área de membros
        SELECT * INTO member_area_record FROM public.member_areas WHERE id = lesson_record.member_area_id;
        
        -- Verificar se quem respondeu é o dono da área (mentor)
        IF member_area_record IS NOT NULL AND (
          NEW.user_id = member_area_record.user_id OR 
          NEW.user_email IS NULL -- Respostas sem email são do mentor
        ) THEN
          -- Criar notificação para o aluno
          INSERT INTO public.member_area_notifications (
            member_area_id,
            student_email,
            type,
            title,
            message,
            data
          ) VALUES (
            lesson_record.member_area_id,
            parent_comment_record.user_email,
            'mentor_reply',
            'O mentor respondeu seu comentário',
            'Você recebeu uma resposta na aula "' || lesson_record.title || '"',
            jsonb_build_object(
              'lesson_id', NEW.lesson_id,
              'lesson_title', lesson_record.title,
              'comment_id', NEW.id
            )
          );
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para notificar quando mentor responde
DROP TRIGGER IF EXISTS trigger_notify_student_on_mentor_reply ON public.lesson_comments;
CREATE TRIGGER trigger_notify_student_on_mentor_reply
AFTER INSERT ON public.lesson_comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_student_on_mentor_reply();

-- Criar função para notificar alunos quando nova aula é adicionada
CREATE OR REPLACE FUNCTION public.notify_students_on_new_lesson()
RETURNS TRIGGER AS $$
DECLARE
  member_area_record RECORD;
  student_record RECORD;
BEGIN
  -- Só notifica se a aula tiver uma área de membros associada e status ativo
  IF NEW.member_area_id IS NOT NULL AND NEW.status = 'active' THEN
    -- Buscar informações da área de membros
    SELECT * INTO member_area_record FROM public.member_areas WHERE id = NEW.member_area_id;
    
    IF member_area_record IS NOT NULL THEN
      -- Notificar todos os alunos da área
      FOR student_record IN 
        SELECT DISTINCT student_email 
        FROM public.member_area_students 
        WHERE member_area_id = NEW.member_area_id
      LOOP
        INSERT INTO public.member_area_notifications (
          member_area_id,
          student_email,
          type,
          title,
          message,
          data
        ) VALUES (
          NEW.member_area_id,
          student_record.student_email,
          'new_lesson',
          'Nova aula disponível!',
          'A aula "' || NEW.title || '" foi adicionada ao curso',
          jsonb_build_object(
            'lesson_id', NEW.id,
            'lesson_title', NEW.title,
            'module_id', NEW.module_id
          )
        );
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para notificar quando nova aula é criada
DROP TRIGGER IF EXISTS trigger_notify_students_on_new_lesson ON public.lessons;
CREATE TRIGGER trigger_notify_students_on_new_lesson
AFTER INSERT ON public.lessons
FOR EACH ROW
EXECUTE FUNCTION public.notify_students_on_new_lesson();