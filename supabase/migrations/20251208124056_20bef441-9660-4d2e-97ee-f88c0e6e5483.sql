-- ================================================
-- SECURITY FIX: Limit public access to profiles
-- Only expose non-sensitive seller info via function
-- ================================================

-- Drop the overly permissive checkout policy
DROP POLICY IF EXISTS "Public can view seller basic info for checkout" ON public.profiles;

-- Create security definer function that returns ONLY non-sensitive seller info
CREATE OR REPLACE FUNCTION public.get_seller_public_info(p_product_id uuid)
RETURNS TABLE (
  full_name text,
  avatar_url text,
  business_name text,
  country text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.full_name,
    pr.avatar_url,
    pr.business_name,
    pr.country
  FROM profiles pr
  INNER JOIN products p ON p.user_id = pr.user_id
  WHERE p.id = p_product_id
  AND p.status = 'Ativo'
  LIMIT 1;
END;
$$;

-- Grant execute to public so checkout can use it
GRANT EXECUTE ON FUNCTION public.get_seller_public_info(uuid) TO anon, authenticated;