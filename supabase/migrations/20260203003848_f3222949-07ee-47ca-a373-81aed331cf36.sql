-- Criar função RPC pública para validar código de afiliado
-- Esta função permite que usuários anônimos no checkout validem códigos de afiliado
CREATE OR REPLACE FUNCTION public.validate_affiliate_for_checkout(
  p_affiliate_code TEXT,
  p_product_id UUID
)
RETURNS TABLE (
  is_valid BOOLEAN,
  commission_rate NUMERIC,
  affiliate_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE as is_valid,
    CAST(a.commission_rate AS NUMERIC) as commission_rate,
    a.affiliate_name
  FROM affiliates a
  WHERE a.affiliate_code = p_affiliate_code
    AND a.product_id = p_product_id
    AND (a.status = 'approved' OR a.status = 'ativo')
  LIMIT 1;
  
  -- Se não encontrou, retorna registro vazio (a query acima retorna 0 linhas)
END;
$$;

-- Permitir acesso anônimo à função
GRANT EXECUTE ON FUNCTION public.validate_affiliate_for_checkout(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_affiliate_for_checkout(TEXT, UUID) TO authenticated;