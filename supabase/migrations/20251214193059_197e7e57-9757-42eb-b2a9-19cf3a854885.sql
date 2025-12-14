-- =====================================================
-- PLANO COMPLETO: Correção Ravimo + Prevenção de Saques Indevidos
-- =====================================================

-- PARTE 1: Corrigir saldo do Ravimo para 1.595.900 Kz
UPDATE customer_balances 
SET balance = 1595900.00, updated_at = now() 
WHERE user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da';

-- PARTE 2: Recriar função admin_process_withdrawal_request com validação de saldo
CREATE OR REPLACE FUNCTION public.admin_process_withdrawal_request(
  request_id UUID,
  new_status TEXT,
  admin_id UUID DEFAULT NULL,
  notes_text TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_amount NUMERIC;
  v_current_balance NUMERIC;
  v_current_status TEXT;
BEGIN
  -- Buscar dados da solicitação
  SELECT user_id, amount, status 
  INTO v_user_id, v_amount, v_current_status
  FROM withdrawal_requests 
  WHERE id = request_id;
  
  -- Verificar se a solicitação existe
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Solicitação de saque não encontrada';
  END IF;
  
  -- Verificar se já foi processada
  IF v_current_status != 'pendente' THEN
    RAISE EXCEPTION 'Esta solicitação já foi processada (status: %)', v_current_status;
  END IF;
  
  -- ⚠️ VALIDAÇÃO CRÍTICA: Verificar saldo ANTES de aprovar
  IF new_status = 'aprovado' THEN
    -- Buscar saldo atual do vendedor
    SELECT balance INTO v_current_balance
    FROM customer_balances 
    WHERE user_id = v_user_id;
    
    -- Se não tem registro de saldo, considerar como 0
    IF v_current_balance IS NULL THEN
      v_current_balance := 0;
    END IF;
    
    -- BLOQUEAR se saldo é negativo
    IF v_current_balance < 0 THEN
      RAISE EXCEPTION '❌ BLOQUEADO: Saldo negativo (% Kz). Não é possível aprovar este saque.', 
        ROUND(v_current_balance, 2);
    END IF;
    
    -- BLOQUEAR se saldo é insuficiente para o valor do saque
    IF v_current_balance < v_amount THEN
      RAISE EXCEPTION '❌ BLOQUEADO: Saldo insuficiente. Saldo atual: % Kz, Valor do saque: % Kz', 
        ROUND(v_current_balance, 2), ROUND(v_amount, 2);
    END IF;
    
    -- Deduzir o valor do saldo do vendedor
    UPDATE customer_balances 
    SET 
      balance = balance - v_amount,
      updated_at = now()
    WHERE user_id = v_user_id;
    
    -- Registrar transação de débito
    INSERT INTO balance_transactions (
      user_id,
      amount,
      type,
      description,
      currency
    ) VALUES (
      v_user_id,
      -v_amount,
      'withdrawal',
      'Saque aprovado - ID: ' || request_id::text,
      'KZ'
    );
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

-- Adicionar comentário explicativo
COMMENT ON FUNCTION public.admin_process_withdrawal_request IS 
'Processa aprovação/rejeição de saques com validação de saldo. 
Bloqueia aprovação se: 1) saldo negativo, 2) saldo insuficiente para o valor do saque.
Atualizado em 2025-12-14 para prevenir saques indevidos.';