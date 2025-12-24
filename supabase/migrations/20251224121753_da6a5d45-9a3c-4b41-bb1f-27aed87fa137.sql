
-- Dropar e recriar função para usar a coluna verified_by_name diretamente
DROP FUNCTION IF EXISTS public.get_all_identity_verifications_for_admin();

CREATE FUNCTION public.get_all_identity_verifications_for_admin()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  birth_date date,
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
    COALESCE(iv.verified_by_name, au.full_name) as verified_by_name
  FROM public.identity_verification iv
  LEFT JOIN public.admin_users au ON iv.verified_by = au.id
  ORDER BY iv.created_at DESC;
$$;
