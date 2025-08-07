
-- Create lesson_progress table to track student progress on lessons
CREATE TABLE public.lesson_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  member_area_id uuid REFERENCES public.member_areas(id) NOT NULL,
  lesson_id uuid REFERENCES public.lessons(id) NOT NULL,
  progress_percentage integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  last_watched_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Create lesson_comments table to store comments on lessons
CREATE TABLE public.lesson_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id uuid REFERENCES public.lessons(id) NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  comment text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for lesson_progress
CREATE POLICY "Users can view their own lesson progress" 
  ON public.lesson_progress 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lesson progress" 
  ON public.lesson_progress 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lesson progress" 
  ON public.lesson_progress 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lesson progress" 
  ON public.lesson_progress 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS policies for lesson_comments
CREATE POLICY "Users can view comments on lessons they have access to" 
  ON public.lesson_comments 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.member_areas ma ON l.member_area_id = ma.id
      JOIN public.member_area_students mas ON ma.id = mas.member_area_id
      WHERE l.id = lesson_comments.lesson_id 
      AND mas.student_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.member_areas ma ON l.member_area_id = ma.id
      WHERE l.id = lesson_comments.lesson_id 
      AND ma.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments on lessons they have access to" 
  ON public.lesson_comments 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND
    (
      EXISTS (
        SELECT 1 FROM public.lessons l
        JOIN public.member_areas ma ON l.member_area_id = ma.id
        JOIN public.member_area_students mas ON ma.id = mas.member_area_id
        WHERE l.id = lesson_comments.lesson_id 
        AND mas.student_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
      OR 
      EXISTS (
        SELECT 1 FROM public.lessons l
        JOIN public.member_areas ma ON l.member_area_id = ma.id
        WHERE l.id = lesson_comments.lesson_id 
        AND ma.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own comments" 
  ON public.lesson_comments 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
  ON public.lesson_comments 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_lesson_progress_updated_at
  BEFORE UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_lesson_comments_updated_at
  BEFORE UPDATE ON public.lesson_comments
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
