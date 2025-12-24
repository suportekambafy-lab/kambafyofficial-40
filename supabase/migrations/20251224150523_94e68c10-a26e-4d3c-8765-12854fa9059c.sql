-- Atualizar função RPC para admins buscarem todos os produtos com TODOS os campos
DROP FUNCTION IF EXISTS get_all_products_for_admin();

CREATE OR REPLACE FUNCTION get_all_products_for_admin()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  description TEXT,
  price TEXT,
  currency TEXT,
  type TEXT,
  status TEXT,
  image_url TEXT,
  checkout_url TEXT,
  admin_approved BOOLEAN,
  approved_by_admin_id UUID,
  approved_by_admin_name TEXT,
  approved_at TIMESTAMPTZ,
  revision_requested BOOLEAN,
  revision_notes TEXT,
  revision_requested_at TIMESTAMPTZ,
  revision_explanation TEXT,
  revision_documents JSONB,
  cover TEXT,
  fantasy_name TEXT,
  sales INTEGER,
  ban_reason TEXT,
  banned_by_admin_id UUID,
  banned_by_admin_name TEXT,
  share_link TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.name,
    p.description,
    p.price,
    p.currency,
    p.type,
    p.status,
    p.image_url,
    p.checkout_url,
    p.admin_approved,
    p.approved_by_admin_id,
    p.approved_by_admin_name,
    p.approved_at,
    p.revision_requested,
    p.revision_notes,
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
  FROM products p
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_products_for_admin() TO anon, authenticated;