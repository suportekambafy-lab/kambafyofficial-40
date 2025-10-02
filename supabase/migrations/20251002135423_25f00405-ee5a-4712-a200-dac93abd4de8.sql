-- Criar políticas especiais para o email de validação validar@kambafy.com
-- Este email terá acesso a TODAS as áreas de membros

-- 1. Permitir que validar@kambafy.com possa visualizar todos os estudantes
CREATE POLICY "Validation email can view all students"
ON public.member_area_students
FOR SELECT
TO authenticated
USING (
  get_current_user_email() = 'validar@kambafy.com'
);

-- 2. Permitir que validar@kambafy.com possa criar sessões em qualquer área
CREATE POLICY "Validation email can create sessions anywhere"
ON public.member_area_sessions
FOR ALL
TO authenticated
USING (
  get_current_user_email() = 'validar@kambafy.com'
)
WITH CHECK (
  get_current_user_email() = 'validar@kambafy.com'
);

-- 3. Permitir que validar@kambafy.com visualize TODAS as aulas (publicadas ou não)
CREATE POLICY "Validation email can view all lessons"
ON public.lessons
FOR SELECT
USING (
  get_current_user_email() = 'validar@kambafy.com'
);

-- 4. Permitir que validar@kambafy.com acesse todas as áreas de membros
CREATE POLICY "Validation email can view all member areas"
ON public.member_areas
FOR SELECT
USING (
  get_current_user_email() = 'validar@kambafy.com'
);

-- 5. Permitir que validar@kambafy.com possa gerenciar progresso em qualquer aula
CREATE POLICY "Validation email can manage all lesson progress"
ON public.lesson_progress
FOR ALL
TO authenticated
USING (
  get_current_user_email() = 'validar@kambafy.com'
)
WITH CHECK (
  get_current_user_email() = 'validar@kambafy.com'
);

-- 6. Permitir que validar@kambafy.com possa visualizar e criar comentários em qualquer aula
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

-- 7. Permitir que validar@kambafy.com possa visualizar todos os módulos
CREATE POLICY "Validation email can view all modules"
ON public.modules
FOR SELECT
USING (
  get_current_user_email() = 'validar@kambafy.com'
);

-- 8. Permitir que validar@kambafy.com possa visualizar todas as ofertas
CREATE POLICY "Validation email can view all member area offers"
ON public.member_area_offers
FOR SELECT
USING (
  get_current_user_email() = 'validar@kambafy.com'
);