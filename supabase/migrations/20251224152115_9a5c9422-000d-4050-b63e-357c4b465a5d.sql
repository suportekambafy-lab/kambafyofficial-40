-- Fix: contar/apurar aprovações de produtos mesmo quando approved_at está NULL
-- Estratégia:
-- 1) Admin approval function passa a preencher approved_at na hora da aprovação.
-- 2) Funções de estatística usam COALESCE(approved_at, updated_at) para não perder aprovações antigas.

CREATE OR REPLACE FUNCTION public.admin_approve_product(
  product_id uuid,
  admin_id uuid DEFAULT NULL::uuid,
  p_admin_email text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_email text;
  v_admin_name text;
  v_admin_id uuid;
BEGIN
  -- Obter email do admin (do parâmetro ou da sessão)
  admin_email := COALESCE(p_admin_email, get_current_user_email());

  -- Verificar se é admin e buscar ID e nome
  SELECT au.id, au.full_name INTO v_admin_id, v_admin_name
  FROM public.admin_users au
  WHERE au.email = admin_email AND au.is_active = true;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required for email %', admin_email;
  END IF;

  -- Atualizar o produto diretamente (bypassa RLS) com info do admin
  UPDATE public.products
  SET
    status = 'Ativo',
    admin_approved = true,
    revision_requested = false,
    revision_requested_at = null,
    approved_by_admin_id = v_admin_id,
    approved_by_admin_name = v_admin_name,
    approved_at = COALESCE(approved_at, now()),
    updated_at = now()
  WHERE id = product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_products_approved_for_admin_stats(
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS TABLE(
  id uuid,
  approved_by_admin_id uuid,
  approved_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.approved_by_admin_id,
    COALESCE(p.approved_at, p.updated_at) AS approved_at
  FROM public.products p
  WHERE p.admin_approved = true
    AND p.approved_by_admin_id IS NOT NULL
    AND (p_start_date IS NULL OR COALESCE(p.approved_at, p.updated_at) >= p_start_date)
    AND (p_end_date IS NULL OR COALESCE(p.approved_at, p.updated_at) <= p_end_date);
END;
$function$;


CREATE OR REPLACE FUNCTION public.count_products_approved_for_admin_stats(
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO v_count
  FROM public.products p
  WHERE p.admin_approved = true
    AND p.approved_by_admin_id IS NOT NULL
    AND (p_start_date IS NULL OR COALESCE(p.approved_at, p.updated_at) >= p_start_date)
    AND (p_end_date IS NULL OR COALESCE(p.approved_at, p.updated_at) <= p_end_date);

  RETURN v_count;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_products_approved_for_admin_stats(timestamp with time zone, timestamp with time zone) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_products_approved_for_admin_stats(timestamp with time zone, timestamp with time zone) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_product(uuid, uuid, text) TO anon, authenticated;
