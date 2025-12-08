-- ================================================
-- SECURITY FIX: Restrict public product data exposure
-- Products are publicly readable but should only expose checkout-relevant fields
-- ================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public can view products for checkout" ON public.products;

-- Create a security definer function for public product info (checkout only)
CREATE OR REPLACE FUNCTION public.get_product_for_checkout(p_product_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price text,
  image text,
  video_url text,
  type text,
  status text,
  slug text,
  category text,
  tags text[],
  allow_custom_price boolean,
  min_custom_price text,
  custom_prices jsonb,
  subscription_interval text,
  subscription_interval_count integer,
  member_area_id uuid,
  access_duration_type text,
  access_duration_value integer,
  access_duration_description text,
  support_email text,
  support_whatsapp text,
  payment_methods jsonb,
  seo_title text,
  seo_description text,
  seo_keywords text[],
  image_alt text
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
    p.image,
    p.video_url,
    p.type,
    p.status,
    p.slug,
    p.category,
    p.tags,
    p.allow_custom_price,
    p.min_custom_price,
    p.custom_prices,
    p.subscription_interval,
    p.subscription_interval_count,
    p.member_area_id,
    p.access_duration_type,
    p.access_duration_value,
    p.access_duration_description,
    p.support_email,
    p.support_whatsapp,
    p.payment_methods,
    p.seo_title,
    p.seo_description,
    p.seo_keywords,
    p.image_alt
  FROM products p
  WHERE p.id = p_product_id
  AND p.status = 'Ativo'
  LIMIT 1;
END;
$$;

-- Create function to get product by slug
CREATE OR REPLACE FUNCTION public.get_product_for_checkout_by_slug(p_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price text,
  image text,
  video_url text,
  type text,
  status text,
  slug text,
  category text,
  tags text[],
  allow_custom_price boolean,
  min_custom_price text,
  custom_prices jsonb,
  subscription_interval text,
  subscription_interval_count integer,
  member_area_id uuid,
  access_duration_type text,
  access_duration_value integer,
  access_duration_description text,
  support_email text,
  support_whatsapp text,
  payment_methods jsonb,
  seo_title text,
  seo_description text,
  seo_keywords text[],
  image_alt text
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
    p.image,
    p.video_url,
    p.type,
    p.status,
    p.slug,
    p.category,
    p.tags,
    p.allow_custom_price,
    p.min_custom_price,
    p.custom_prices,
    p.subscription_interval,
    p.subscription_interval_count,
    p.member_area_id,
    p.access_duration_type,
    p.access_duration_value,
    p.access_duration_description,
    p.support_email,
    p.support_whatsapp,
    p.payment_methods,
    p.seo_title,
    p.seo_description,
    p.seo_keywords,
    p.image_alt
  FROM products p
  WHERE p.slug = p_slug
  AND p.status = 'Ativo'
  LIMIT 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_product_for_checkout(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_for_checkout_by_slug(text) TO anon, authenticated;