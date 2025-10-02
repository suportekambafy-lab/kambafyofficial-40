-- Atualizar políticas RLS para permitir acesso apenas ao email validar@kambafy.com
-- Este é o único email que deve ter acesso total às áreas de membros

-- Remover políticas antigas baseadas em admin_users
DROP POLICY IF EXISTS "Admin users can view all students" ON public.member_area_students;
DROP POLICY IF EXISTS "Admin users can create sessions anywhere" ON public.member_area_sessions;
DROP POLICY IF EXISTS "Admin users can view all lessons" ON public.lessons;
DROP POLICY IF EXISTS "Admin users can view all member areas" ON public.member_areas;
DROP POLICY IF EXISTS "Admin users can manage all lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Admin users can view all comments" ON public.lesson_comments;
DROP POLICY IF EXISTS "Admin users can create comments anywhere" ON public.lesson_comments;
DROP POLICY IF EXISTS "Admin users can view all modules" ON public.modules;
DROP POLICY IF EXISTS "Admin users can view all member area offers" ON public.member_area_offers;

-- Criar políticas específicas para validar@kambafy.com

-- 1. Validação pode ver todos os estudantes
CREATE POLICY "Validation email can view all students"
ON public.member_area_students
FOR SELECT
USING (
  get_current_user_email() = 'validar@kambafy.com'
);

-- 2. Validação pode criar sessões em qualquer área
CREATE POLICY "Validation email can create sessions anywhere"
ON public.member_area_sessions
FOR ALL
USING (
  get_current_user_email() = 'validar@kambafy.com'
)
WITH CHECK (
  get_current_user_email() = 'validar@kambafy.com'
);

-- 3. Validação pode ver todas as aulas
CREATE POLICY "Validation email can view all lessons"
ON public.lessons
FOR SELECT
USING (
  get_current_user_email() = 'validar@kambafy.com'
);

-- 4. Validação pode acessar todas as áreas de membros
CREATE POLICY "Validation email can view all member areas"
ON public.member_areas
FOR SELECT
USING (
  get_current_user_email() = 'validar@kambafy.com'
);

-- 5. Validação pode gerenciar progresso em qualquer aula
CREATE POLICY "Validation email can manage all lesson progress"
ON public.lesson_progress
FOR ALL
USING (
  get_current_user_email() = 'validar@kambafy.com'
)
WITH CHECK (
  get_current_user_email() = 'validar@kambafy.com'
);

-- 6. Validação pode visualizar e criar comentários em qualquer aula
CREATE POLICY "Validation email can view all comments"
ON public.lesson_comments
FOR SELECT
USING (
  get_current_user_email() = 'validar@kambafy.com'
);

CREATE POLICY "Validation email can create comments anywhere"
ON public.lesson_comments
FOR INSERT
WITH CHECK (
  get_current_user_email() = 'validar@kambafy.com'
);

-- 7. Validação pode visualizar todos os módulos
CREATE POLICY "Validation email can view all modules"
ON public.modules
FOR SELECT
USING (
  get_current_user_email() = 'validar@kambafy.com'
);

-- 8. Validação pode visualizar todas as ofertas
CREATE POLICY "Validation email can view all member area offers"
ON public.member_area_offers
FOR SELECT
USING (
  get_current_user_email() = 'validar@kambafy.com'
);