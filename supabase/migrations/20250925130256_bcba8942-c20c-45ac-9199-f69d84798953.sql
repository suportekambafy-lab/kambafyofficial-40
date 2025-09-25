-- Função para obter o email do usuário atual de forma segura
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    ''
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Atualizar política problemática da tabela lessons
DROP POLICY IF EXISTS "Students can view published lessons" ON public.lessons;

CREATE POLICY "Students can view published lessons" 
ON public.lessons 
FOR SELECT 
USING (
  (status = 'published'::text) 
  AND (member_area_id IS NOT NULL) 
  AND (
    (EXISTS ( 
      SELECT 1
      FROM member_area_students mas
      WHERE ((mas.member_area_id = lessons.member_area_id) 
        AND (mas.student_email = get_current_user_email()))
    )) 
    OR 
    (EXISTS ( 
      SELECT 1
      FROM member_area_sessions sess
      WHERE ((sess.member_area_id = lessons.member_area_id) 
        AND (sess.student_email = get_current_user_email()) 
        AND (sess.expires_at > now()))
    ))
  )
);

-- Verificar se há outras políticas problemáticas e corrigir
DROP POLICY IF EXISTS "Students can create comments on lessons they have access to" ON public.lesson_comments;
DROP POLICY IF EXISTS "Users can create comments on lessons they have access to" ON public.lesson_comments;
DROP POLICY IF EXISTS "Students can view comments on lessons they have access to" ON public.lesson_comments;
DROP POLICY IF EXISTS "Users can view comments on lessons they have access to" ON public.lesson_comments;

-- Recriar políticas de comentários com função segura
CREATE POLICY "Students can create comments on lessons they have access to" 
ON public.lesson_comments 
FOR INSERT 
WITH CHECK (
  (auth.uid() = user_id) 
  AND (
    (EXISTS ( 
      SELECT 1
      FROM ((lessons l
        JOIN member_areas ma ON ((l.member_area_id = ma.id)))
        JOIN member_area_students mas ON ((ma.id = mas.member_area_id)))
      WHERE ((l.id = lesson_comments.lesson_id) 
        AND (mas.student_email = get_current_user_email()))
    )) 
    OR 
    (EXISTS ( 
      SELECT 1
      FROM (lessons l
        JOIN member_areas ma ON ((l.member_area_id = ma.id)))
      WHERE ((l.id = lesson_comments.lesson_id) 
        AND (ma.user_id = auth.uid()))
    ))
  )
);

CREATE POLICY "Students can view comments on lessons they have access to" 
ON public.lesson_comments 
FOR SELECT 
USING (
  (EXISTS ( 
    SELECT 1
    FROM ((lessons l
      JOIN member_areas ma ON ((l.member_area_id = ma.id)))
      JOIN member_area_students mas ON ((ma.id = mas.member_area_id)))
    WHERE ((l.id = lesson_comments.lesson_id) 
      AND (mas.student_email = get_current_user_email()))
  )) 
  OR 
  (EXISTS ( 
    SELECT 1
    FROM (lessons l
      JOIN member_areas ma ON ((l.member_area_id = ma.id)))
    WHERE ((l.id = lesson_comments.lesson_id) 
      AND (ma.user_id = auth.uid()))
  ))
);