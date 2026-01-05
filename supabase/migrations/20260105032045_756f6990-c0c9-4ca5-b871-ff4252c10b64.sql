-- Drop e recriar a função RPC para incluir o campo currency
DROP FUNCTION IF EXISTS public.get_all_withdrawal_requests_for_admin();

CREATE FUNCTION public.get_all_withdrawal_requests_for_admin()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  amount numeric,
  currency text,
  status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  admin_notes text,
  admin_processed_by uuid,
  admin_processed_by_name text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    wr.id,
    wr.user_id,
    wr.amount,
    COALESCE(wr.currency, 'KZ') as currency,
    wr.status,
    wr.created_at,
    wr.updated_at,
    wr.admin_notes,
    wr.admin_processed_by,
    au.full_name as admin_processed_by_name
  FROM public.withdrawal_requests wr
  LEFT JOIN public.admin_users au ON wr.admin_processed_by = au.id
  ORDER BY wr.created_at DESC;
$$;