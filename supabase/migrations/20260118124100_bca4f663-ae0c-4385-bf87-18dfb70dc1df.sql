-- Update the process_coproducer_commissions function to respect commission source settings
CREATE OR REPLACE FUNCTION public.process_coproducer_commissions(
  p_order_id UUID,
  p_product_id UUID,
  p_seller_amount NUMERIC,
  p_currency TEXT,
  p_product_name TEXT,
  p_is_affiliate_sale BOOLEAN DEFAULT FALSE
) RETURNS NUMERIC AS $$
DECLARE
  v_coproducer RECORD;
  v_coproducer_amount NUMERIC;
  v_remaining_amount NUMERIC := p_seller_amount;
BEGIN
  -- Buscar todos os co-produtores aceitos, não cancelados e não expirados
  -- Filtrar também pela origem da venda (produtor ou afiliado)
  FOR v_coproducer IN (
    SELECT 
      c.id,
      c.coproducer_user_id,
      c.coproducer_email,
      c.coproducer_name,
      c.commission_rate,
      c.expires_at,
      c.canceled_at,
      c.commission_from_producer_sales,
      c.commission_from_affiliate_sales
    FROM public.coproducers c
    WHERE c.product_id = p_product_id
      AND c.status = 'accepted'
      AND c.coproducer_user_id IS NOT NULL
      AND c.canceled_at IS NULL
      AND (c.expires_at IS NULL OR c.expires_at > NOW())
      -- Verificar se o co-produtor deve receber comissão desta venda
      AND (
        (p_is_affiliate_sale = FALSE AND c.commission_from_producer_sales = TRUE)
        OR
        (p_is_affiliate_sale = TRUE AND c.commission_from_affiliate_sales = TRUE)
      )
  ) LOOP
    -- Calcular valor do co-produtor
    v_coproducer_amount := ROUND(p_seller_amount * (v_coproducer.commission_rate / 100), 2);
    
    -- Criar transação de balanço para o co-produtor
    INSERT INTO public.balance_transactions (
      user_id,
      type,
      amount,
      currency,
      description,
      order_id,
      email
    ) VALUES (
      v_coproducer.coproducer_user_id,
      'coproduction_revenue',
      v_coproducer_amount,
      p_currency,
      CASE 
        WHEN p_is_affiliate_sale THEN 'Co-produção (venda afiliado): ' || p_product_name
        ELSE 'Co-produção: ' || p_product_name
      END,
      p_order_id,
      v_coproducer.coproducer_email
    );
    
    -- Subtrair do valor restante do vendedor
    v_remaining_amount := v_remaining_amount - v_coproducer_amount;
    
    RAISE LOG '[Coproduction] Co-produtor % recebe % % (% pct) - venda afiliado: %', 
      v_coproducer.coproducer_email, v_coproducer_amount, p_currency, v_coproducer.commission_rate, p_is_affiliate_sale;
  END LOOP;
  
  RETURN v_remaining_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;