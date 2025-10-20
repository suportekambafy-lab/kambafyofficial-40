
-- ✅ Recriar função get_lessons_for_student para retornar TODAS as aulas
-- A lógica de acesso será tratada no frontend
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
BEGIN
  -- ✅ Retornar TODAS as aulas publicadas da área de membros
  -- A verificação de acesso será feita no frontend
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
  ORDER BY l.order_number;
END;
$$;
