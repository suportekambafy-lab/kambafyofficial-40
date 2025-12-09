-- Primeiro dropar a função existente
DROP FUNCTION IF EXISTS public.get_all_identity_verifications_for_admin();

-- Recriar função com o campo country incluído
CREATE OR REPLACE FUNCTION public.get_all_identity_verifications_for_admin()
RETURNS TABLE(
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
  verified_at timestamp with time zone,
  verified_by uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    user_id,
    full_name,
    birth_date,
    document_type,
    document_number,
    document_front_url,
    document_back_url,
    country,
    status,
    rejection_reason,
    verified_at,
    verified_by,
    created_at,
    updated_at
  FROM public.identity_verification
  ORDER BY created_at DESC;
$$;