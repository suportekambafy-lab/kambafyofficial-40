-- Função para corrigir saldos de transferências aprovadas sem taxa
CREATE OR REPLACE FUNCTION public.fix_bank_transfer_commissions()
RETURNS TABLE(
  order_id text,
  seller_user_id uuid,
  valor_original numeric,
  valor_creditado numeric,
  taxa_devida numeric,
  corrigido boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  transfer_record RECORD;
  taxa_valor numeric;
  valor_correto numeric;
BEGIN
  -- Iterar sobre todas as vendas de transferência bancária completadas
  FOR transfer_record IN 
    SELECT 
      o.order_id,
      o.user_id as seller_user_id,
      o.amount::numeric as valor_venda,
      bt.amount as valor_creditado,
      bt.id as transaction_id,
      p.name as product_name
    FROM orders o
    JOIN balance_transactions bt ON bt.order_id = o.order_id
    JOIN products p ON p.id = o.product_id
    WHERE o.payment_method IN ('transfer', 'bank_transfer', 'transferencia')
      AND o.status = 'completed'
      AND bt.type = 'credit'
      AND bt.description LIKE '%Venda do produto%'
      -- Apenas transações onde foi creditado 100% (sem taxa)
      AND bt.amount = o.amount::numeric
      -- Evitar processar transações já corrigidas
      AND NOT EXISTS (
        SELECT 1 FROM balance_transactions bt2 
        WHERE bt2.order_id = o.order_id 
        AND bt2.type = 'kambafy_fee'
        AND bt2.description LIKE '%Correção de taxa%'
      )
    ORDER BY o.created_at ASC
  LOOP
    -- Calcular taxa de 8,99%
    taxa_valor := transfer_record.valor_venda * 0.0899;
    valor_correto := transfer_record.valor_venda * 0.9101;
    
    -- Criar transação de débito para corrigir a taxa
    INSERT INTO balance_transactions (
      user_id,
      type,
      amount,
      currency,
      description,
      order_id
    ) VALUES (
      transfer_record.seller_user_id,
      'kambafy_fee',
      -taxa_valor,
      'KZ',
      'Correção de taxa não aplicada (8.99%) - ' || transfer_record.product_name,
      transfer_record.order_id
    );
    
    -- Retornar informações da correção
    RETURN QUERY SELECT 
      transfer_record.order_id,
      transfer_record.seller_user_id,
      transfer_record.valor_venda,
      transfer_record.valor_creditado,
      taxa_valor,
      true;
      
  END LOOP;
  
  RETURN;
END;
$function$;