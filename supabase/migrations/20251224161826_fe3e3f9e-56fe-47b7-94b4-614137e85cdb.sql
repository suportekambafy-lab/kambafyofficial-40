-- Fix get_all_products_for_admin: remove references to non-existent columns on products
CREATE OR REPLACE FUNCTION public.get_all_products_for_admin()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  name text,
  description text,
  price text,
  currency text,
  type text,
  status text,
  image_url text,
  checkout_url text,
  admin_approved boolean,
  approved_by_admin_id uuid,
  approved_by_admin_name text,
  approved_at timestamp with time zone,
  revision_requested boolean,
  revision_notes text,
  revision_requested_at timestamp with time zone,
  revision_explanation text,
  revision_documents jsonb,
  cover text,
  fantasy_name text,
  sales integer,
  ban_reason text,
  banned_by_admin_id uuid,
  banned_by_admin_name text,
  share_link text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.name,
    p.description,
    p.price,
    NULL::text AS currency,
    p.type,
    p.status,
    NULL::text AS image_url,
    NULL::text AS checkout_url,
    p.admin_approved,
    p.approved_by_admin_id,
    p.approved_by_admin_name,
    p.approved_at,
    p.revision_requested,
    NULL::text AS revision_notes,
    p.revision_requested_at,
    p.revision_explanation,
    p.revision_documents,
    p.cover,
    p.fantasy_name,
    p.sales,
    p.ban_reason,
    p.banned_by_admin_id,
    p.banned_by_admin_name,
    p.share_link,
    p.created_at,
    p.updated_at
  FROM public.products p
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_products_for_admin() TO anon, authenticated;