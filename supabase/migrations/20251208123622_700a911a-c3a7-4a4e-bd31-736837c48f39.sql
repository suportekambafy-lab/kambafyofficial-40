-- ================================================
-- CORREÇÃO: member_area_students - Remover acesso público
-- ================================================

-- Remover política que permite acesso público a todos
DROP POLICY IF EXISTS "Public can verify student access for login" ON public.member_area_students;

-- Remover política de sistema com with_check = true
DROP POLICY IF EXISTS "System can add students" ON public.member_area_students;

-- Criar política segura para adicionar estudantes (apenas service_role)
CREATE POLICY "Only service role can add students"
ON public.member_area_students
FOR INSERT
TO service_role
WITH CHECK (true);

-- Criar política para estudantes verem apenas seus próprios dados
CREATE POLICY "Students can view own data"
ON public.member_area_students
FOR SELECT
TO authenticated
USING (student_email = get_current_user_email());

-- Garantir RLS forçado
ALTER TABLE public.member_area_students FORCE ROW LEVEL SECURITY;