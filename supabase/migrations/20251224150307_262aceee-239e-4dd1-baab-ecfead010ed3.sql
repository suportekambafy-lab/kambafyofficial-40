-- Função RPC para admins buscarem produtos aprovados com info do admin (bypassa RLS)
CREATE OR REPLACE FUNCTION get_products_approved_for_admin_stats(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  approved_by_admin_id UUID,
  approved_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.approved_by_admin_id,
    p.approved_at
  FROM products p
  WHERE p.admin_approved = true
    AND p.approved_by_admin_id IS NOT NULL
    AND p.approved_at IS NOT NULL
    AND (p_start_date IS NULL OR p.approved_at >= p_start_date)
    AND (p_end_date IS NULL OR p.approved_at <= p_end_date);
END;
$$;

-- Função RPC para contar total de produtos aprovados (bypassa RLS)
CREATE OR REPLACE FUNCTION count_products_approved_for_admin_stats(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM products p
  WHERE p.admin_approved = true
    AND p.approved_by_admin_id IS NOT NULL
    AND p.approved_at IS NOT NULL
    AND (p_start_date IS NULL OR p.approved_at >= p_start_date)
    AND (p_end_date IS NULL OR p.approved_at <= p_end_date);
  
  RETURN v_count;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION get_products_approved_for_admin_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION count_products_approved_for_admin_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;