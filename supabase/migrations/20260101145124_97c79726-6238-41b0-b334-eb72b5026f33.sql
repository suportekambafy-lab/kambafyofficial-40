-- =============================================
-- REMOVER ESTORNO AUTOMÁTICO EM SAQUES REJEITADOS
-- Saques rejeitados/suspensos NÃO devolvem valor
-- =============================================

-- 1) Remover trigger duplicado
DROP TRIGGER IF EXISTS refund_rejected_withdrawal ON withdrawal_requests;

-- 2) Atualizar função para NÃO criar estorno
CREATE OR REPLACE FUNCTION refund_rejected_withdrawal()
RETURNS TRIGGER AS $$
BEGIN
  -- DESACTIVADO: Saques rejeitados ou suspensos NÃO devolvem valor
  -- O valor fica retido pela plataforma
  -- Apenas log para auditoria
  IF NEW.status = 'rejeitado' AND (OLD.status IS NULL OR OLD.status != 'rejeitado') THEN
    RAISE NOTICE 'Saque % rejeitado - valor retido: % KZ (NÃO devolvido)', NEW.id, NEW.amount;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3) Atualizar RPC para NÃO criar transação de estorno
CREATE OR REPLACE FUNCTION public.admin_process_withdrawal_request(
  request_id UUID,
  new_status TEXT,
  admin_id UUID DEFAULT NULL,
  notes_text TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_amount NUMERIC;
  v_current_status TEXT;
BEGIN
  -- Buscar informações do saque
  SELECT user_id, amount, status INTO v_user_id, v_amount, v_current_status
  FROM withdrawal_requests
  WHERE id = request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  -- Validar status
  IF new_status NOT IN ('aprovado', 'rejeitado', 'suspenso') THEN
    RAISE EXCEPTION 'Invalid status. Must be aprovado, rejeitado, or suspenso';
  END IF;
  
  -- Atualizar o status do saque
  UPDATE withdrawal_requests
  SET 
    status = new_status,
    admin_notes = notes_text,
    admin_processed_by = admin_id,
    updated_at = NOW()
  WHERE id = request_id;
  
  -- REMOVIDO: Não criar transação de estorno
  -- Valor fica retido pela plataforma para rejeitado E suspenso
  
END;
$$;