-- Tabela para configuração de quizzes na área de membros
CREATE TABLE public.member_area_quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_area_id UUID NOT NULL REFERENCES public.member_areas(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  passing_score INTEGER DEFAULT 70,
  show_correct_answers BOOLEAN DEFAULT true,
  allow_retake BOOLEAN DEFAULT true,
  max_attempts INTEGER,
  time_limit_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT quiz_target_check CHECK (
    (lesson_id IS NOT NULL AND module_id IS NULL) OR 
    (lesson_id IS NULL AND module_id IS NOT NULL)
  )
);

-- Tabela para respostas dos quizzes pelos alunos
CREATE TABLE public.member_area_quiz_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.member_area_quizzes(id) ON DELETE CASCADE,
  member_area_id UUID NOT NULL REFERENCES public.member_areas(id) ON DELETE CASCADE,
  student_email TEXT NOT NULL,
  student_name TEXT,
  responses JSONB NOT NULL DEFAULT '[]'::jsonb,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN DEFAULT false,
  attempt_number INTEGER DEFAULT 1,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  time_spent_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.member_area_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_area_quiz_responses ENABLE ROW LEVEL SECURITY;

-- Políticas para quizzes
CREATE POLICY "Owners can manage quizzes" 
ON public.member_area_quizzes 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.member_areas 
    WHERE id = member_area_quizzes.member_area_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Students can view active quizzes" 
ON public.member_area_quizzes 
FOR SELECT 
USING (is_active = true);

-- Políticas para respostas
CREATE POLICY "Owners can view all responses" 
ON public.member_area_quiz_responses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.member_areas 
    WHERE id = member_area_quiz_responses.member_area_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Students can insert their responses" 
ON public.member_area_quiz_responses 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Students can view their own responses" 
ON public.member_area_quiz_responses 
FOR SELECT 
USING (true);

-- Índices
CREATE INDEX idx_member_area_quizzes_member_area ON public.member_area_quizzes(member_area_id);
CREATE INDEX idx_member_area_quizzes_lesson ON public.member_area_quizzes(lesson_id);
CREATE INDEX idx_member_area_quizzes_module ON public.member_area_quizzes(module_id);
CREATE INDEX idx_member_area_quiz_responses_quiz ON public.member_area_quiz_responses(quiz_id);
CREATE INDEX idx_member_area_quiz_responses_student ON public.member_area_quiz_responses(student_email);
CREATE INDEX idx_member_area_quiz_responses_member_area ON public.member_area_quiz_responses(member_area_id);

-- Trigger para updated_at
CREATE TRIGGER update_member_area_quizzes_updated_at
BEFORE UPDATE ON public.member_area_quizzes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();