-- Adicionar campo para data de liberação da retenção
ALTER TABLE public.profiles 
ADD COLUMN retention_release_date timestamp with time zone;

-- Adicionar campo para dias de retenção no histórico
ALTER TABLE public.seller_retention_history
ADD COLUMN retention_days integer;

-- Atualizar a função admin_set_seller_retention para aceitar dias
CREATE OR REPLACE FUNCTION public.admin_set_seller_retention(
  p_user_id uuid, 
  p_retention_percentage integer, 
  p_reason text, 
  p_admin_email text,
  p_retention_days integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old_percentage integer;
  v_user_email text;
  v_release_date timestamp with time zone;
BEGIN
  -- Verificar se é admin ativo
  IF NOT EXISTS (
    SELECT 1 FROM admin_users 
    WHERE email = p_admin_email AND is_active = true
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  -- Validar porcentagem
  IF p_retention_percentage < 0 OR p_retention_percentage > 100 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid percentage');
  END IF;
  
  -- Calcular data de liberação se dias foram fornecidos
  IF p_retention_days IS NOT NULL AND p_retention_days > 0 THEN
    v_release_date := now() + (p_retention_days || ' days')::interval;
  ELSE
    v_release_date := NULL; -- Sem liberação automática
  END IF;
  
  -- Buscar porcentagem antiga e email do usuário
  SELECT balance_retention_percentage, email INTO v_old_percentage, v_user_email
  FROM profiles
  WHERE user_id = p_user_id;
  
  IF v_user_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Atualizar perfil
  UPDATE profiles
  SET 
    balance_retention_percentage = p_retention_percentage,
    retention_reason = p_reason,
    retention_release_date = v_release_date,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Registrar no histórico
  INSERT INTO seller_retention_history (
    user_id, 
    admin_email, 
    old_percentage, 
    new_percentage, 
    reason,
    retention_days
  )
  VALUES (
    p_user_id, 
    p_admin_email, 
    COALESCE(v_old_percentage, 0), 
    p_retention_percentage, 
    p_reason,
    p_retention_days
  );
  
  -- Registrar log administrativo
  INSERT INTO admin_action_logs (admin_email, action, target_type, target_id, details)
  VALUES (
    p_admin_email,
    'set_balance_retention',
    'profile',
    p_user_id,
    jsonb_build_object(
      'old_percentage', COALESCE(v_old_percentage, 0),
      'new_percentage', p_retention_percentage,
      'reason', p_reason,
      'retention_days', p_retention_days,
      'release_date', v_release_date,
      'user_email', v_user_email
    )
  );
  
  RETURN json_build_object(
    'success', true,
    'old_percentage', COALESCE(v_old_percentage, 0),
    'new_percentage', p_retention_percentage,
    'release_date', v_release_date,
    'user_email', v_user_email
  );
END;
$function$;

-- Criar função para liberar retenções expiradas automaticamente
CREATE OR REPLACE FUNCTION public.release_expired_retentions()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_released_count integer := 0;
  v_profile RECORD;
BEGIN
  -- Buscar perfis com retenção expirada
  FOR v_profile IN 
    SELECT user_id, email, balance_retention_percentage, retention_reason
    FROM profiles
    WHERE balance_retention_percentage > 0
      AND retention_release_date IS NOT NULL
      AND retention_release_date <= now()
  LOOP
    -- Liberar retenção
    UPDATE profiles
    SET 
      balance_retention_percentage = 0,
      retention_reason = 'Liberação automática após período definido',
      retention_release_date = NULL,
      updated_at = now()
    WHERE user_id = v_profile.user_id;
    
    -- Registrar no histórico
    INSERT INTO seller_retention_history (
      user_id,
      admin_email,
      old_percentage,
      new_percentage,
      reason
    ) VALUES (
      v_profile.user_id,
      'system@kambafy.com',
      v_profile.balance_retention_percentage,
      0,
      'Liberação automática após período definido'
    );
    
    v_released_count := v_released_count + 1;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'released_count', v_released_count,
    'timestamp', now()
  );
END;
$function$;