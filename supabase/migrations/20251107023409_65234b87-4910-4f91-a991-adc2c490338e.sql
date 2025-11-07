-- Adicionar campos de retenção na tabela profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS balance_retention_percentage integer DEFAULT 0 CHECK (balance_retention_percentage >= 0 AND balance_retention_percentage <= 100),
ADD COLUMN IF NOT EXISTS retention_reason text;

-- Adicionar índice para performance
CREATE INDEX IF NOT EXISTS idx_profiles_retention ON profiles(balance_retention_percentage) WHERE balance_retention_percentage > 0;

-- Criar tabela de histórico de retenção
CREATE TABLE IF NOT EXISTS seller_retention_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  admin_email text NOT NULL,
  old_percentage integer NOT NULL DEFAULT 0,
  new_percentage integer NOT NULL,
  reason text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- RLS para histórico
ALTER TABLE seller_retention_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view retention history"
ON seller_retention_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.email = get_current_user_email() 
    AND admin_users.is_active = true
  )
);

CREATE POLICY "System can insert retention history"
ON seller_retention_history FOR INSERT
WITH CHECK (true);

-- Função para calcular saldo disponível com retenção
CREATE OR REPLACE FUNCTION get_available_balance_with_retention(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_balance numeric;
  v_retention_percentage integer;
  v_available_balance numeric;
BEGIN
  -- Buscar saldo total
  SELECT COALESCE(balance, 0) INTO v_total_balance
  FROM customer_balances
  WHERE user_id = p_user_id;
  
  -- Buscar porcentagem de retenção
  SELECT COALESCE(balance_retention_percentage, 0) INTO v_retention_percentage
  FROM profiles
  WHERE user_id = p_user_id;
  
  -- Calcular saldo disponível após retenção
  v_available_balance := v_total_balance * (100 - v_retention_percentage) / 100;
  
  RETURN GREATEST(v_available_balance, 0);
END;
$$;

-- Função RPC para admin definir retenção
CREATE OR REPLACE FUNCTION admin_set_seller_retention(
  p_user_id uuid,
  p_retention_percentage integer,
  p_reason text,
  p_admin_email text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_percentage integer;
  v_user_email text;
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
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Registrar no histórico
  INSERT INTO seller_retention_history (user_id, admin_email, old_percentage, new_percentage, reason)
  VALUES (p_user_id, p_admin_email, COALESCE(v_old_percentage, 0), p_retention_percentage, p_reason);
  
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
      'user_email', v_user_email
    )
  );
  
  RETURN json_build_object(
    'success', true,
    'old_percentage', COALESCE(v_old_percentage, 0),
    'new_percentage', p_retention_percentage,
    'user_email', v_user_email
  );
END;
$$;

-- Atualizar função de processamento de saque para validar retenção
CREATE OR REPLACE FUNCTION admin_process_withdrawal_request(
  request_id uuid, 
  new_status text, 
  admin_id uuid DEFAULT NULL::uuid, 
  notes_text text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request RECORD;
  v_available_balance numeric;
BEGIN
  -- Buscar dados da solicitação
  SELECT * INTO v_request
  FROM withdrawal_requests
  WHERE id = request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação de saque não encontrada';
  END IF;
  
  -- Se for aprovação, validar contra saldo disponível com retenção
  IF new_status = 'aprovado' THEN
    v_available_balance := get_available_balance_with_retention(v_request.user_id);
    
    IF v_request.amount > v_available_balance THEN
      RAISE EXCEPTION 'Valor solicitado (%) excede saldo disponível após retenção (%)', 
        v_request.amount, v_available_balance;
    END IF;
  END IF;
  
  -- Atualizar status da solicitação
  UPDATE withdrawal_requests 
  SET 
    status = new_status,
    admin_processed_by = admin_id,
    admin_notes = notes_text,
    updated_at = now()
  WHERE id = request_id;
END;
$$;