-- ================================================
-- CORREÇÃO: member_area_students - Emails e nomes expostos
-- ================================================

-- Remover políticas públicas perigosas se existirem
DROP POLICY IF EXISTS "Anyone can view students" ON public.member_area_students;
DROP POLICY IF EXISTS "Public can view students" ON public.member_area_students;

-- Garantir que RLS está ativo
ALTER TABLE public.member_area_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_area_students FORCE ROW LEVEL SECURITY;