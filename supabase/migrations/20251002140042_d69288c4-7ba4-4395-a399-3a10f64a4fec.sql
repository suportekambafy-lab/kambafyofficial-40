-- Adicionar validar@kambafy.com como usuário admin
INSERT INTO public.admin_users (email, password_hash, full_name, is_active)
VALUES (
  'validar@kambafy.com',
  '$2a$10$YourHashHereForValidationAccount123456789012345678901234567890',
  'Validação Kambafy',
  true
)
ON CONFLICT (email) DO UPDATE SET is_active = true, updated_at = now();

-- Remover políticas antigas do email de validação se existirem
DROP POLICY IF EXISTS "Validation email can view all students" ON public.member_area_students;
DROP POLICY IF EXISTS "Validation email can create sessions anywhere" ON public.member_area_sessions;
DROP POLICY IF EXISTS "Validation email can view all lessons" ON public.lessons;
DROP POLICY IF EXISTS "Validation email can view all member areas" ON public.member_areas;
DROP POLICY IF EXISTS "Validation email can manage all lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Validation email can view all comments" ON public.lesson_comments;
DROP POLICY IF EXISTS "Validation email can create comments anywhere" ON public.lesson_comments;
DROP POLICY IF EXISTS "Validation email can view all modules" ON public.modules;
DROP POLICY IF EXISTS "Validation email can view all member area offers" ON public.member_area_offers;

-- Políticas para admin_users terem acesso completo

-- 1. Admins podem ver todos os estudantes
CREATE POLICY "Admin users can view all students"
ON public.member_area_students
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = get_current_user_email()
    AND is_active = true
  )
);

-- 2. Admins podem criar sessões em qualquer área
CREATE POLICY "Admin users can create sessions anywhere"
ON public.member_area_sessions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = get_current_user_email()
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = get_current_user_email()
    AND is_active = true
  )
);

-- 3. Admins podem ver todas as aulas
CREATE POLICY "Admin users can view all lessons"
ON public.lessons
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = get_current_user_email()
    AND is_active = true
  )
);

-- 4. Admins podem ver todas as áreas de membros
CREATE POLICY "Admin users can view all member areas"
ON public.member_areas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = get_current_user_email()
    AND is_active = true
  )
);

-- 5. Admins podem gerenciar todo o progresso de lições
CREATE POLICY "Admin users can manage all lesson progress"
ON public.lesson_progress
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = get_current_user_email()
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = get_current_user_email()
    AND is_active = true
  )
);

-- 6. Admins podem ver e criar comentários
CREATE POLICY "Admin users can view all comments"
ON public.lesson_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = get_current_user_email()
    AND is_active = true
  )
);

CREATE POLICY "Admin users can create comments anywhere"
ON public.lesson_comments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = get_current_user_email()
    AND is_active = true
  )
);

-- 7. Admins podem ver todos os módulos
CREATE POLICY "Admin users can view all modules"
ON public.modules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = get_current_user_email()
    AND is_active = true
  )
);

-- 8. Admins podem ver todas as ofertas
CREATE POLICY "Admin users can view all member area offers"
ON public.member_area_offers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = get_current_user_email()
    AND is_active = true
  )
);