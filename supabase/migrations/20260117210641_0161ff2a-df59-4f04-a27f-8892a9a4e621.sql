-- Tabela para rastrear emails de aulas já enviados
CREATE TABLE public.lesson_notification_sent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_email TEXT NOT NULL,
  member_area_id UUID NOT NULL REFERENCES public.member_areas(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lesson_id, student_email)
);

-- Index para buscas rápidas
CREATE INDEX idx_lesson_notification_sent_lesson_id ON public.lesson_notification_sent(lesson_id);
CREATE INDEX idx_lesson_notification_sent_student_email ON public.lesson_notification_sent(student_email);

-- RLS
ALTER TABLE public.lesson_notification_sent ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção via service role (edge functions)
CREATE POLICY "Service role can manage lesson notifications"
ON public.lesson_notification_sent
FOR ALL
USING (true)
WITH CHECK (true);