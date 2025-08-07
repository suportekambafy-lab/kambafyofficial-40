-- Adicionar código único de afiliado e campos para rastreamento de comissões
ALTER TABLE public.affiliates 
ADD COLUMN affiliate_code VARCHAR(10) UNIQUE DEFAULT (UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8)));

-- Adicionar colunas para rastreamento de comissões nas orders
ALTER TABLE public.orders 
ADD COLUMN affiliate_code VARCHAR(10),
ADD COLUMN affiliate_commission NUMERIC,
ADD COLUMN seller_commission NUMERIC;

-- Criar função para calcular e dividir comissões
CREATE OR REPLACE FUNCTION calculate_commissions(
  order_amount NUMERIC,
  commission_rate TEXT,
  has_affiliate BOOLEAN
) RETURNS TABLE (
  affiliate_commission NUMERIC,
  seller_commission NUMERIC
) AS $$
DECLARE
  commission_decimal NUMERIC;
  affiliate_cut NUMERIC;
  seller_cut NUMERIC;
BEGIN
  -- Converter porcentagem para decimal
  commission_decimal := (REPLACE(commission_rate, '%', '')::NUMERIC) / 100;
  
  IF has_affiliate THEN
    -- Se tem afiliado, dividir a comissão
    affiliate_cut := order_amount * commission_decimal;
    seller_cut := order_amount - affiliate_cut;
  ELSE
    -- Se não tem afiliado, vendedor recebe tudo
    affiliate_cut := 0;
    seller_cut := order_amount;
  END IF;
  
  RETURN QUERY SELECT affiliate_cut, seller_cut;
END;
$$ LANGUAGE plpgsql;