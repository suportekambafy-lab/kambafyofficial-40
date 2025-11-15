
-- Função para remover retenção de saldo de um vendedor
CREATE OR REPLACE FUNCTION admin_remove_seller_retention(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_retention_percentage NUMERIC;
  old_retained_fixed NUMERIC;
BEGIN
  -- Buscar valores atuais
  SELECT 
    balance_retention_percentage,
    retained_fixed_amount
  INTO 
    old_retention_percentage,
    old_retained_fixed
  FROM profiles
  WHERE user_id = target_user_id;
  
  -- Remover retenção
  UPDATE profiles
  SET 
    balance_retention_percentage = 0,
    retained_fixed_amount = 0,
    retention_release_date = NULL
  WHERE user_id = target_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'old_retention_percentage', old_retention_percentage,
    'old_retained_fixed', old_retained_fixed,
    'new_retention_percentage', 0,
    'new_retained_fixed', 0
  );
END;
$$;
