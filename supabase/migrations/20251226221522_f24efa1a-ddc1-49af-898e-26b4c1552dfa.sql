-- Corrigir tipos da função RPC com paginação
DROP FUNCTION IF EXISTS get_all_products_for_admin_paginated(integer, integer);

CREATE OR REPLACE FUNCTION get_all_products_for_admin_paginated(
  p_limit integer DEFAULT 1000,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  price TEXT,
  user_id UUID,
  admin_approved BOOLEAN,
  status TEXT,
  type TEXT,
  cover TEXT,
  fantasy_name TEXT,
  sales INTEGER,
  ban_reason TEXT,
  created_at TIMESTAMPTZ,
  revision_requested BOOLEAN,
  revision_requested_at TIMESTAMPTZ,
  revision_explanation TEXT,
  revision_documents JSONB,
  share_link TEXT,
  approved_by_admin_id UUID,
  approved_by_admin_name TEXT,
  banned_by_admin_id UUID,
  banned_by_admin_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.user_id,
    p.admin_approved,
    p.status,
    p.type,
    p.cover,
    p.fantasy_name,
    p.sales,
    p.ban_reason,
    p.created_at,
    p.revision_requested,
    p.revision_requested_at,
    p.revision_explanation,
    p.revision_documents,
    p.share_link,
    p.approved_by_admin_id,
    p.approved_by_admin_name,
    p.banned_by_admin_id,
    p.banned_by_admin_name
  FROM products p
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_products_for_admin_paginated(integer, integer) TO anon, authenticated;