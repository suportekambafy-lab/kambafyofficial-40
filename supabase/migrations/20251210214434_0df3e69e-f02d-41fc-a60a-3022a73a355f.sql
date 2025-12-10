-- =====================================================
-- FIX: Criar função segura para contar estudantes por área de membros
-- Resolve problema de RLS que impede owners de contar estudantes
-- =====================================================

-- Função SECURITY DEFINER para contar estudantes (bypass RLS de forma segura)
CREATE OR REPLACE FUNCTION public.count_member_area_students(p_member_area_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_count INTEGER;
BEGIN
  -- Verificar se o usuário atual é o dono da área de membros
  SELECT user_id INTO v_owner_id 
  FROM member_areas 
  WHERE id = p_member_area_id;
  
  -- Se não é o dono, retorna 0
  IF v_owner_id IS NULL OR v_owner_id != auth.uid() THEN
    RETURN 0;
  END IF;
  
  -- Contar estudantes
  SELECT COUNT(*) INTO v_count
  FROM member_area_students
  WHERE member_area_id = p_member_area_id;
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Dar permissão para usuários autenticados chamarem a função
GRANT EXECUTE ON FUNCTION public.count_member_area_students(UUID) TO authenticated;