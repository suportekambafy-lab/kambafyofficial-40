-- Criar tabela para registrar taxas de recuperação
CREATE TABLE public.recovery_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  abandoned_purchase_id UUID NOT NULL,
  seller_user_id UUID NOT NULL,
  order_id TEXT NOT NULL,
  recovery_amount NUMERIC NOT NULL,
  fee_amount NUMERIC NOT NULL,
  fee_percentage NUMERIC NOT NULL DEFAULT 20.0,
  currency TEXT NOT NULL DEFAULT 'KZ',
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recovery_fees ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own recovery fees" 
ON public.recovery_fees 
FOR SELECT 
USING (auth.uid() = seller_user_id);

CREATE POLICY "System can insert recovery fees" 
ON public.recovery_fees 
FOR INSERT 
WITH CHECK (true);

-- Função para processar taxa de recuperação
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
  
  -- Calcular taxa (20% do valor recuperado)
  fee_amount := purchase_record.amount * (_fee_percentage / 100.0);
  
  -- Registrar taxa de recuperação
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
  
  -- Criar transação negativa no saldo do vendedor
  INSERT INTO public.balance_transactions (
    user_id,
    type,
    amount,
    currency,
    description,
    order_id
  ) VALUES (
    purchase_record.seller_user_id,
    'recovery_fee',
    -fee_amount,
    purchase_record.currency,
    'Taxa de recuperação de venda (20%)',
    _order_id
  );
  
  RETURN fee_record_id;
END;
$$;