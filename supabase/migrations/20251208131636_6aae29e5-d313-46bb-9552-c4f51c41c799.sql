-- Fix get_product_for_checkout and get_product_for_checkout_by_slug functions
-- The minimum_price and suggested_price columns are NUMERIC in the table, not TEXT

DROP FUNCTION IF EXISTS get_product_for_checkout(UUID);
DROP FUNCTION IF EXISTS get_product_for_checkout_by_slug(TEXT);

CREATE OR REPLACE FUNCTION get_product_for_checkout(p_product_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  price TEXT,
  cover TEXT,
  status TEXT,
  slug TEXT,
  custom_prices JSONB,
  allow_custom_price BOOLEAN,
  minimum_price NUMERIC,
  suggested_price NUMERIC,
  compare_at_price TEXT,
  payment_methods JSONB,
  member_area_id UUID,
  type TEXT,
  fantasy_name TEXT,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],
  image_alt TEXT,
  access_duration_type TEXT,
  access_duration_value INTEGER,
  access_duration_description TEXT,
  subscription_config JSONB
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
    p.custom_prices,
    p.allow_custom_price,
    p.minimum_price,
    p.suggested_price,
    p.compare_at_price,
    p.payment_methods,
    p.member_area_id,
    p.type,
    p.fantasy_name,
    p.seo_title,
    p.seo_description,
    p.seo_keywords,
    p.image_alt,
    p.access_duration_type,
    p.access_duration_value,
    p.access_duration_description,
    p.subscription_config
  FROM products p
  WHERE p.id = p_product_id 
    AND p.status IN ('Ativo', 'active', 'Inativo', 'Banido');
END;
$$;

CREATE OR REPLACE FUNCTION get_product_for_checkout_by_slug(p_slug TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  price TEXT,
  cover TEXT,
  status TEXT,
  slug TEXT,
  custom_prices JSONB,
  allow_custom_price BOOLEAN,
  minimum_price NUMERIC,
  suggested_price NUMERIC,
  compare_at_price TEXT,
  payment_methods JSONB,
  member_area_id UUID,
  type TEXT,
  fantasy_name TEXT,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],
  image_alt TEXT,
  access_duration_type TEXT,
  access_duration_value INTEGER,
  access_duration_description TEXT,
  subscription_config JSONB
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
    p.custom_prices,
    p.allow_custom_price,
    p.minimum_price,
    p.suggested_price,
    p.compare_at_price,
    p.payment_methods,
    p.member_area_id,
    p.type,
    p.fantasy_name,
    p.seo_title,
    p.seo_description,
    p.seo_keywords,
    p.image_alt,
    p.access_duration_type,
    p.access_duration_value,
    p.access_duration_description,
    p.subscription_config
  FROM products p
  WHERE p.slug = p_slug 
    AND p.status IN ('Ativo', 'active', 'Inativo', 'Banido');
END;
$$;

GRANT EXECUTE ON FUNCTION get_product_for_checkout(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_product_for_checkout_by_slug(TEXT) TO anon, authenticated;