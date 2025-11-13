-- Função para atualizar taxas antigas de 8% para 8.99%
CREATE OR REPLACE FUNCTION public.update_old_commission_rates()
RETURNS TABLE(
  order_id text,
  taxa_antiga numeric,
  taxa_nova numeric,
  diferenca numeric,
  updated boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  transaction_record RECORD;
  taxa_antiga numeric;
  taxa_nova numeric;
  diferenca numeric;
BEGIN
  -- Atualizar transações com taxa antiga de 8%
  FOR transaction_record IN 
    SELECT 
      bt.id,
      bt.order_id,
      bt.amount as taxa_atual,
      o.amount::numeric as valor_venda
    FROM balance_transactions bt
    JOIN orders o ON o.order_id = bt.order_id
    WHERE o.payment_method IN ('transfer', 'bank_transfer', 'transferencia')
      AND o.status = 'completed'
      AND bt.type = 'platform_fee'
      AND (bt.description LIKE '%8%' AND bt.description NOT LIKE '%8.99%')
  LOOP
    -- Calcular valores
    taxa_antiga := ABS(transaction_record.taxa_atual);
    taxa_nova := ROUND(transaction_record.valor_venda * 0.0899, 2);
    diferenca := taxa_nova - taxa_antiga;
    
    -- Atualizar a transação
    UPDATE balance_transactions
    SET 
      amount = -taxa_nova,
      description = REPLACE(description, '(8%)', '(8.99%)'),
      type = 'kambafy_fee'
    WHERE id = transaction_record.id;
    
    -- Retornar informações
    RETURN QUERY SELECT 
      transaction_record.order_id,
      taxa_antiga,
      taxa_nova,
      diferenca,
      true;
  END LOOP;
  
  RETURN;
END;
$function$;