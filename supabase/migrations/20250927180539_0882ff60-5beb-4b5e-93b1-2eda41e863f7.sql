-- Função simplificada para confirmar email
CREATE OR REPLACE FUNCTION public.admin_confirm_user_email(user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Usar uma abordagem alternativa
  SELECT 1; -- Placeholder function
$$;