-- Criar função para aplicar comissão de 8.99% em TODAS as transferências aprovadas sem taxa
CREATE OR REPLACE FUNCTION public.apply_commission_to_all_transfers()
RETURNS TABLE(
  order_id text,
  seller_email text,
  valor_original numeric,
  taxa_aplicada numeric,
  valor_liquido numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  transfer_record RECORD;
  taxa_valor numeric;
BEGIN
  -- Processar TODAS as transferências aprovadas sem taxa aplicada
  FOR transfer_record IN 
    SELECT DISTINCT
      o.order_id,
      o.user_id as seller_user_id,
      o.customer_email as seller_email,
      o.amount::numeric as valor_venda,
      p.name as product_name
    FROM orders o
    JOIN products p ON p.id = o.product_id
    WHERE o.payment_method IN ('transfer', 'bank_transfer', 'transferencia')
      AND o.status = 'completed'
      -- Apenas pedidos que NÃO têm taxa kambafy_fee aplicada
      AND NOT EXISTS (
        SELECT 1 FROM balance_transactions bt 
        WHERE bt.order_id = o.order_id 
        AND bt.type = 'kambafy_fee'
      )
    ORDER BY o.created_at ASC
  LOOP
    -- Calcular taxa de 8.99%
    taxa_valor := ROUND(transfer_record.valor_venda * 0.0899, 2);
    
    -- Criar transação de débito para aplicar a taxa
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
      'kambafy_fee',
      -taxa_valor,
      'KZ',
      'Taxa da plataforma (8.99%) - ' || transfer_record.product_name,
      transfer_record.order_id,
      transfer_record.seller_email
    );
    
    -- Retornar informações da correção
    RETURN QUERY SELECT 
      transfer_record.order_id,
      transfer_record.seller_email,
      transfer_record.valor_venda,
      taxa_valor,
      transfer_record.valor_venda - taxa_valor;
      
  END LOOP;
  
  RETURN;
END;
$function$;