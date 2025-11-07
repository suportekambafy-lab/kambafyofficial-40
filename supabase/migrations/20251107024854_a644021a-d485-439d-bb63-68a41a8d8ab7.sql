-- Função para admins buscarem todos os saldos (bypassa RLS)
CREATE OR REPLACE FUNCTION admin_get_all_balances()
RETURNS TABLE (
  user_id uuid,
  balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Permitir que qualquer admin autenticado busque saldos
  RETURN QUERY
  SELECT 
    cb.user_id,
    cb.balance
  FROM customer_balances cb;
END;
$$;

-- Função para admins buscarem todos os saques (bypassa RLS)
CREATE OR REPLACE FUNCTION admin_get_all_withdrawals()
RETURNS TABLE (
  user_id uuid,
  amount numeric,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wr.user_id,
    wr.amount,
    wr.status
  FROM withdrawal_requests wr
  WHERE wr.status = 'aprovado';
END;
$$;