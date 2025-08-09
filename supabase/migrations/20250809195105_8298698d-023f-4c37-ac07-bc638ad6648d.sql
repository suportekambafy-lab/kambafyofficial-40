-- Reverter trigger para não aplicar taxa em todas as vendas
DROP TRIGGER IF EXISTS apply_kambafy_fee_trigger ON orders;

-- Remover função que aplicava taxa em todas as vendas
DROP FUNCTION IF EXISTS public.apply_kambafy_fee();

-- Restaurar função de taxa de recuperação para aplicar taxa real
CREATE OR REPLACE FUNCTION public.process_recovery_fee(
  _abandoned_purchase_id UUID,
  _order_id TEXT,
  _fee_percentage NUMERIC DEFAULT 20.0
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fee_record_id UUID;
  purchase_record RECORD;
  fee_amount NUMERIC;
  seller_net_amount NUMERIC;
BEGIN
  -- Buscar dados do carrinho abandonado
  SELECT ap.*, p.user_id as seller_user_id 
  INTO purchase_record
  FROM abandoned_purchases ap
  JOIN products p ON ap.product_id = p.id
  WHERE ap.id = _abandoned_purchase_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carrinho abandonado não encontrado';
  END IF;
  
  -- Calcular taxa e valor líquido
  fee_amount := purchase_record.amount * (_fee_percentage / 100.0);
  seller_net_amount := purchase_record.amount - fee_amount;
  
  -- Registrar taxa da Kambafy (negativa para o vendedor)
  INSERT INTO public.balance_transactions (
    user_id,
    type,
    amount,
    currency,
    description,
    order_id
  ) VALUES (
    purchase_record.seller_user_id,
    'kambafy_fee',
    -fee_amount,
    purchase_record.currency,
    'Taxa da plataforma Kambafy (20%) - Venda Recuperada',
    _order_id
  );
  
  -- Registrar valor líquido para o vendedor
  INSERT INTO public.balance_transactions (
    user_id,
    type,
    amount,
    currency,
    description,
    order_id
  ) VALUES (
    purchase_record.seller_user_id,
    'sale_revenue',
    seller_net_amount,
    purchase_record.currency,
    'Receita de venda recuperada (valor líquido)',
    _order_id
  );
  
  -- Registrar a taxa para controle
  INSERT INTO public.recovery_fees (
    abandoned_purchase_id,
    seller_user_id,
    order_id,
    recovery_amount,
    fee_amount,
    fee_percentage,
    currency
  ) VALUES (
    _abandoned_purchase_id,
    purchase_record.seller_user_id,
    _order_id,
    purchase_record.amount,
    fee_amount,
    _fee_percentage,
    purchase_record.currency
  ) RETURNING id INTO fee_record_id;
  
  RETURN fee_record_id;
END;
$$;