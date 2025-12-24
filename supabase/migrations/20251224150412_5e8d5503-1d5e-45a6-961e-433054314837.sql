-- Função RPC para admins buscarem todos os produtos (bypassa RLS)
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
    p.created_at,
    p.updated_at
  FROM products p
  ORDER BY p.created_at DESC;
END;
$$;

-- Função RPC para contar todos os produtos para admin
CREATE OR REPLACE FUNCTION count_all_products_for_admin()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count FROM products;
  RETURN v_count;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION get_all_products_for_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION count_all_products_for_admin() TO anon, authenticated;