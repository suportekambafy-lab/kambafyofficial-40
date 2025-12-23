-- Primeiro dropar as funções existentes para poder alterá-las
DROP FUNCTION IF EXISTS public.get_all_withdrawal_requests_for_admin();
DROP FUNCTION IF EXISTS public.get_all_identity_verifications_for_admin();

-- Recriar função RPC para retornar nome do admin que processou saques
CREATE FUNCTION public.get_all_withdrawal_requests_for_admin()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  amount numeric,
  status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  admin_notes text,
  admin_processed_by uuid,
  admin_processed_by_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    wr.id,
    wr.user_id,
    wr.amount,
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

-- Recriar função RPC para verificações de identidade com nome do admin
CREATE FUNCTION public.get_all_identity_verifications_for_admin()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  birth_date text,
  document_type text,
  document_number text,
  document_front_url text,
  document_back_url text,
  country text,
  status text,
  rejection_reason text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  verified_at timestamp with time zone,
  verified_by uuid,
  verified_by_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    iv.id,
    iv.user_id,
    iv.full_name,
    iv.birth_date,
    iv.document_type,
    iv.document_number,
    iv.document_front_url,
    iv.document_back_url,
    iv.country,
    iv.status,
    iv.rejection_reason,
    iv.created_at,
    iv.updated_at,
    iv.verified_at,
    iv.verified_by,
    au.full_name as verified_by_name
  FROM public.identity_verification iv
  LEFT JOIN public.admin_users au ON iv.verified_by = au.id
  ORDER BY iv.created_at DESC;
$$;