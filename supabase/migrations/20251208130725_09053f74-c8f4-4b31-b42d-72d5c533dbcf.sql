-- Fix the get_public_product_data function with correct column types
DROP FUNCTION IF EXISTS get_public_product_data(UUID);

CREATE OR REPLACE FUNCTION get_public_product_data(p_product_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  price TEXT,
  cover TEXT,
  status TEXT,
  slug TEXT,
  type TEXT,
  fantasy_name TEXT,
  allow_affiliates BOOLEAN,
  commission_rate NUMERIC,
  custom_prices JSONB,
  allow_custom_price BOOLEAN,
  minimum_price TEXT,
  suggested_price TEXT,
  compare_at_price TEXT,
  payment_methods JSONB,
  member_area_id UUID,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],
  image_alt TEXT,
  access_duration_type TEXT,
  access_duration_value INTEGER,
  access_duration_description TEXT,
  subscription_config JSONB,
  user_id UUID
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
    p.cover,
    p.status,
    p.slug,
    p.type,
    p.fantasy_name,
    p.allow_affiliates,
    p.commission_rate,
    p.custom_prices,
    p.allow_custom_price,
    p.minimum_price,
    p.suggested_price,
    p.compare_at_price,
    p.payment_methods,
    p.member_area_id,
    p.seo_title,
    p.seo_description,
    p.seo_keywords,
    p.image_alt,
    p.access_duration_type,
    p.access_duration_value,
    p.access_duration_description,
    p.subscription_config,
    p.user_id
  FROM products p
  WHERE p.id = p_product_id 
    AND p.status = 'Ativo' 
    AND p.allow_affiliates = true;
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_product_data(UUID) TO anon, authenticated;