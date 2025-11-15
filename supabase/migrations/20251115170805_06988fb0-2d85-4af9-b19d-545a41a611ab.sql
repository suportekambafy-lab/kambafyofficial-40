
-- Função para definir data de liberação da retenção
CREATE OR REPLACE FUNCTION admin_set_retention_release_date(
  target_user_id UUID,
  days_until_release INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_release_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calcular nova data de liberação
  new_release_date := NOW() + (days_until_release || ' days')::INTERVAL;
  
  -- Atualizar perfil
  UPDATE profiles
  SET retention_release_date = new_release_date
  WHERE user_id = target_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'days_until_release', days_until_release,
    'release_date', new_release_date,
    'release_date_formatted', TO_CHAR(new_release_date, 'DD/MM/YYYY HH24:MI')
  );
END;
$$;
