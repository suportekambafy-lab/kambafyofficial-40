
-- Criar função RPC para que administradores possam ver todas as solicitações de saque
CREATE OR REPLACE FUNCTION public.get_all_withdrawal_requests_for_admin()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  amount NUMERIC,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  admin_processed_by UUID
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    id,
    user_id,
    amount,
    status,
    created_at,
    updated_at,
    admin_notes,
    admin_processed_by
  FROM public.withdrawal_requests
  ORDER BY created_at DESC;
$$;

-- Garantir que a função pode ser executada por usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_all_withdrawal_requests_for_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_withdrawal_requests_for_admin() TO anon;
