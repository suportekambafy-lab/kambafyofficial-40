-- Criar função para admin acessar todas as verificações de identidade
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
  status text,
  rejection_reason text,
  verified_at timestamp with time zone,
  verified_by uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT 
    iv.id,
    iv.user_id,
    iv.full_name,
    iv.birth_date,
    iv.document_type,
    iv.document_number,
    iv.document_front_url,
    iv.document_back_url,
    iv.status,
    iv.rejection_reason,
    iv.verified_at,
    iv.verified_by,
    iv.created_at,
    iv.updated_at
  FROM public.identity_verification iv
  ORDER BY iv.created_at DESC;
$function$;