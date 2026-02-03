-- Fix validate_affiliate_for_checkout to handle commission_rate like '90%'
CREATE OR REPLACE FUNCTION public.validate_affiliate_for_checkout(
  p_affiliate_code text,
  p_product_id uuid
)
RETURNS TABLE(
  is_valid boolean,
  commission_rate numeric,
  affiliate_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE AS is_valid,
    NULLIF(regexp_replace(a.commission_rate, '[^0-9\\.]', '', 'g'), '')::numeric AS commission_rate,
    a.affiliate_name
  FROM public.affiliates a
  WHERE a.affiliate_code = p_affiliate_code
    AND a.product_id = p_product_id
    AND (a.status = 'approved' OR a.status = 'ativo')
    AND NULLIF(regexp_replace(a.commission_rate, '[^0-9\\.]', '', 'g'), '') IS NOT NULL
  LIMIT 1;
END;
$$;

-- Ensure anon/authenticated can call it from checkout
GRANT EXECUTE ON FUNCTION public.validate_affiliate_for_checkout(text, uuid) TO anon, authenticated;