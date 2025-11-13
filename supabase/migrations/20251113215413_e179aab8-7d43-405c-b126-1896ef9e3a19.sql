-- Ajustar função para respeitar o constraint UNIQUE (order_id, user_id)
DROP FUNCTION IF EXISTS public.apply_commission_to_all_transfers();

CREATE FUNCTION public.apply_commission_to_all_transfers()
RETURNS TABLE(
  order_id text,
  seller_email text,
  valor_original numeric,
  taxa_aplicada numeric,
  valor_liquido numeric,
  acao text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  transfer_record RECORD;
  taxa_valor numeric;
  valor_liquido numeric;
BEGIN
  -- Processar APENAS transferências aprovadas SEM nenhuma transação
  FOR transfer_record IN 
    SELECT 
      o.order_id,
      o.user_id as seller_user_id,
      o.customer_email as seller_email,
      o.amount::numeric as valor_venda,
      p.name as product_name,
      o.created_at
    FROM orders o
    JOIN products p ON p.id = o.product_id
    WHERE o.payment_method IN ('transfer', 'bank_transfer', 'transferencia')
      AND o.status = 'completed'
      -- Apenas pedidos que NÃO têm NENHUMA transação
      AND NOT EXISTS (
        SELECT 1 FROM balance_transactions bt
        WHERE bt.order_id = o.order_id 
        AND bt.user_id = o.user_id
      )
    ORDER BY o.created_at ASC
  LOOP
    -- Calcular valores
    taxa_valor := ROUND(transfer_record.valor_venda * 0.0899, 2);
    valor_liquido := transfer_record.valor_venda - taxa_valor;
    
    -- Criar UMA transação com o valor líquido (já descontada a taxa de 8.99%)
    INSERT INTO balance_transactions (
      user_id,
      type,
      amount,
      currency,
      description,
      order_id,
      email
    ) VALUES (
      transfer_record.seller_user_id,
      'sale_revenue',
      valor_liquido,
      'KZ',
      'Receita de venda (líquido após 8.99% de taxa) - ' || transfer_record.product_name,
      transfer_record.order_id,
      transfer_record.seller_email
    );
    
    -- Retornar info
    RETURN QUERY SELECT 
      transfer_record.order_id,
      transfer_record.seller_email,
      transfer_record.valor_venda,
      taxa_valor,
      valor_liquido,
      'Criado sale_revenue (valor líquido)'::text;
    
  END LOOP;
  
  RETURN;
END;
$function$;