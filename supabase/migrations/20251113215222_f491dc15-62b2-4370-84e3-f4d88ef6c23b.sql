-- Dropar função antiga e criar nova com tipo de retorno atualizado
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
  has_any_transaction boolean;
BEGIN
  -- Processar TODAS as transferências aprovadas
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
    ORDER BY o.created_at ASC
  LOOP
    -- Verificar se já tem ALGUMA transação para este pedido
    SELECT EXISTS (
      SELECT 1 FROM balance_transactions 
      WHERE order_id = transfer_record.order_id 
      AND user_id = transfer_record.seller_user_id
    ) INTO has_any_transaction;
    
    -- Calcular valores
    taxa_valor := ROUND(transfer_record.valor_venda * 0.0899, 2);
    valor_liquido := transfer_record.valor_venda - taxa_valor;
    
    -- Se NÃO tem nenhuma transação, criar sale_revenue E kambafy_fee
    IF NOT has_any_transaction THEN
      -- Criar transação de receita líquida
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
        'Receita de venda (valor líquido) - ' || transfer_record.product_name,
        transfer_record.order_id,
        transfer_record.seller_email
      );
      
      -- Criar transação de taxa
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
      
      -- Retornar info
      RETURN QUERY SELECT 
        transfer_record.order_id,
        transfer_record.seller_email,
        transfer_record.valor_venda,
        taxa_valor,
        valor_liquido,
        'Criado sale_revenue + taxa'::text;
        
    -- Se tem transação mas NÃO tem taxa, adicionar apenas a taxa
    ELSIF NOT EXISTS (
      SELECT 1 FROM balance_transactions 
      WHERE order_id = transfer_record.order_id 
      AND user_id = transfer_record.seller_user_id
      AND type = 'kambafy_fee'
    ) THEN
      -- Criar apenas transação de taxa
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
      
      -- Retornar info
      RETURN QUERY SELECT 
        transfer_record.order_id,
        transfer_record.seller_email,
        transfer_record.valor_venda,
        taxa_valor,
        valor_liquido,
        'Adicionado taxa apenas'::text;
    END IF;
    
  END LOOP;
  
  RETURN;
END;
$function$;