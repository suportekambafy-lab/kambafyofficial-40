
-- Corrigir função get_lessons_for_student com schema correto
DROP FUNCTION IF EXISTS public.get_lessons_for_student(TEXT, UUID);

CREATE OR REPLACE FUNCTION public.get_lessons_for_student(
  p_student_email TEXT,
  p_member_area_id UUID
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  video_url TEXT,
  hls_url TEXT,
  bunny_video_id TEXT,
  bunny_embed_url TEXT,
  video_data JSONB,
  duration INTEGER,
  order_number INTEGER,
  status TEXT,
  module_id UUID,
  member_area_id UUID,
  user_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  is_scheduled BOOLEAN,
  complementary_links JSONB,
  lesson_materials JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_valid_session BOOLEAN;
  v_is_student BOOLEAN;
BEGIN
  -- Normalizar email
  p_student_email := LOWER(TRIM(p_student_email));
  
  -- Verificar se tem sessão válida
  SELECT EXISTS (
    SELECT 1 FROM public.member_area_sessions sess
    WHERE sess.student_email = p_student_email
      AND sess.member_area_id = p_member_area_id
      AND sess.expires_at > NOW()
  ) INTO v_has_valid_session;
  
  -- Verificar se é estudante cadastrado
  SELECT EXISTS (
    SELECT 1 FROM public.member_area_students mas
    WHERE mas.student_email = p_student_email
      AND mas.member_area_id = p_member_area_id
  ) INTO v_is_student;
  
  -- Se não tem sessão válida E não é estudante, retornar vazio
  IF NOT v_has_valid_session AND NOT v_is_student THEN
    RETURN;
  END IF;
  
  -- Retornar aulas publicadas acessíveis
  RETURN QUERY
  SELECT 
    l.id,
    l.title,
    l.description,
    l.video_url,
    l.hls_url,
    l.bunny_video_id,
    l.bunny_embed_url,
    l.video_data,
    l.duration,
    l.order_number,
    l.status,
    l.module_id,
    l.member_area_id,
    l.user_id,
    l.created_at,
    l.updated_at,
    l.scheduled_at,
    l.is_scheduled,
    l.complementary_links,
    l.lesson_materials
  FROM public.lessons l
  WHERE l.member_area_id = p_member_area_id
    AND l.status = 'published'
    AND (
      -- Aula sem módulo (sempre acessível)
      l.module_id IS NULL
      OR
      -- Módulo não é pago
      NOT EXISTS (
        SELECT 1 FROM public.modules m
        WHERE m.id = l.module_id AND m.is_paid = true
      )
      OR
      -- Estudante tem acesso ao módulo pago (verificar apenas se existe o acesso)
      EXISTS (
        SELECT 1 FROM public.module_student_access msa
        WHERE msa.module_id = l.module_id
          AND msa.student_email = p_student_email
      )
    )
  ORDER BY l.order_number, l.created_at;
END;
$$;

-- Grant execute to anon e authenticated
GRANT EXECUTE ON FUNCTION public.get_lessons_for_student(TEXT, UUID) TO anon, authenticated;
