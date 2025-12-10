-- =====================================================
-- FIX: Remover política permissiva que expõe TODOS os dados de progresso
-- =====================================================

-- Remover a política permissiva perigosa que usa "true"
DROP POLICY IF EXISTS "Public can manage lesson progress" ON public.lesson_progress;

-- As seguintes políticas restritivas já existem e continuarão funcionando:
-- 1. "Students can view own progress" - SELECT (por user_email, user_id, ou owner da member_area)
-- 2. "Students can insert own progress" - INSERT (por user_email ou user_id)
-- 3. "Students can update own progress" - UPDATE (por user_email ou user_id)
-- 4. "Validation email can manage all lesson progress" - ALL (apenas validar@kambafy.com)