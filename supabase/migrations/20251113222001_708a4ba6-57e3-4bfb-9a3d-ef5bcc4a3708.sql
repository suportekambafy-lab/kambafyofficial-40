-- Atualizar seller_commission para TODAS as vendas por transferência (não só completed)
CREATE OR REPLACE FUNCTION fix_all_transfer_seller_commission()
RETURNS TABLE(
  order_id_result text,
  status_venda text,
  valor_bruto numeric,
  valor_liquido_calculado numeric,
  atualizado boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  order_record RECORD;
  valor_liquido numeric;
BEGIN
  FOR order_record IN 
    SELECT 
      o.order_id as order_ref,
      o.status as status_atual,
      o.amount::numeric as valor_original,
      o.seller_commission::numeric as commission_atual
    FROM orders o
    JOIN products p ON p.id = o.product_id
    WHERE p.user_id = 'dd6cb74b-cb86-43f7-8386-f39b981522da'
      AND o.payment_method IN ('transfer', 'bank_transfer', 'transferencia')
      AND o.status IN ('completed', 'pending', 'cancelled')
  LOOP
    -- Calcular valor líquido (8.99% de taxa = multiplicar por 0.9101)
    valor_liquido := ROUND(order_record.valor_original * 0.9101, 2);
    
    -- Atualizar seller_commission se estiver diferente
    IF order_record.commission_atual != valor_liquido THEN
      UPDATE orders
      SET seller_commission = valor_liquido
      WHERE orders.order_id = order_record.order_ref;
      
      RETURN QUERY SELECT 
        order_record.order_ref,
        order_record.status_atual,
        order_record.valor_original,
        valor_liquido,
        true;
    END IF;
  END LOOP;
END;
$$;

-- Executar a correção para todas as vendas
SELECT * FROM fix_all_transfer_seller_commission();