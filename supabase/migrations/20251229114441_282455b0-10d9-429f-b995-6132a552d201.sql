-- Função RPC para admin criar transação de saldo (bypass RLS)
CREATE OR REPLACE FUNCTION public.admin_create_balance_transaction(
  p_user_id uuid,
  p_type text,
  p_amount numeric,
  p_currency text,
  p_description text,
  p_order_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id uuid;
BEGIN
  -- Inserir transação de saldo
  INSERT INTO balance_transactions (
    user_id,
    type,
    amount,
    currency,
    description,
    order_id
  ) VALUES (
    p_user_id,
    p_type,
    p_amount,
    p_currency,
    p_description,
    p_order_id
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id
  );
EXCEPTION
  WHEN unique_violation THEN
    -- Se já existe, retornar sucesso (idempotente)
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Transaction already exists'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Conceder permissão para usuários autenticados chamarem a função
GRANT EXECUTE ON FUNCTION public.admin_create_balance_transaction TO authenticated;

COMMENT ON FUNCTION public.admin_create_balance_transaction IS 'Cria transação de saldo - SECURITY DEFINER para bypass RLS';