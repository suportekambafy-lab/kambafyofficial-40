-- Drop all existing versions of admin_ban_product
DROP FUNCTION IF EXISTS public.admin_ban_product(uuid, uuid);
DROP FUNCTION IF EXISTS public.admin_ban_product(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.admin_ban_product(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.admin_ban_product(uuid, uuid, text, text, text);

-- Create single definitive version with JWT validation
CREATE OR REPLACE FUNCTION public.admin_ban_product(
  product_id uuid,
  admin_id uuid DEFAULT NULL,
  ban_reason_text text DEFAULT NULL,
  p_admin_email text DEFAULT NULL,
  p_jwt_token text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_email TEXT;
  jwt_valid RECORD;
BEGIN
  -- Se JWT fornecido, validar primeiro
  IF p_jwt_token IS NOT NULL THEN
    SELECT * INTO jwt_valid FROM public.verify_admin_jwt(p_jwt_token);
    
    IF NOT jwt_valid.is_valid THEN
      RAISE EXCEPTION 'JWT inválido ou expirado';
    END IF;
    
    admin_email := jwt_valid.email;
  ELSE
    -- Fallback para email fornecido (compatibilidade)
    admin_email := COALESCE(p_admin_email, get_current_user_email());
  END IF;
  
  -- Verificar se é admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = admin_email
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required for email %', admin_email;
  END IF;

  -- Atualizar o produto
  UPDATE public.products 
  SET 
    status = 'Banido',
    admin_approved = false,
    ban_reason = ban_reason_text,
    updated_at = now()
  WHERE id = product_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;
  
  -- Registrar ação no log de auditoria
  INSERT INTO public.admin_action_logs (
    admin_email,
    action,
    target_type,
    target_id,
    jwt_used,
    details
  ) VALUES (
    admin_email,
    'product_ban',
    'product',
    product_id,
    (p_jwt_token IS NOT NULL),
    jsonb_build_object(
      'ban_reason', ban_reason_text,
      'admin_id', admin_id
    )
  );
END;
$function$;