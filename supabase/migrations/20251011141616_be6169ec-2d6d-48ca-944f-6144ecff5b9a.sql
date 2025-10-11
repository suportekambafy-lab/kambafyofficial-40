
-- ============================================
-- CORREÇÃO: Platform Fees Órfãs - Parte 1
-- ============================================

-- 1. Adicionar constraint única em customer_balances se não existir
DO $$ 
BEGIN
  -- Verificar se a constraint já existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'customer_balances_user_id_key'
  ) THEN
    -- Remover duplicatas primeiro (manter apenas o mais recente)
    DELETE FROM customer_balances a
    USING customer_balances b
    WHERE a.user_id = b.user_id 
    AND a.created_at < b.created_at;
    
    -- Adicionar constraint única
    ALTER TABLE customer_balances
    ADD CONSTRAINT customer_balances_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 2. Deletar platform_fees órfãs (sem order completada correspondente)
DELETE FROM public.balance_transactions bt
WHERE bt.type = 'platform_fee'
AND NOT EXISTS (
  SELECT 1 FROM public.orders o 
  WHERE o.order_id = bt.order_id 
  AND o.status = 'completed'
)
AND NOT EXISTS (
  SELECT 1 FROM public.module_payments mp
  WHERE mp.order_id = bt.order_id
  AND mp.status = 'completed'
);

-- 3. Atualizar trigger para APENAS criar transações em 'completed'
CREATE OR REPLACE FUNCTION public.create_balance_transaction_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  product_record RECORD;
  gross_amount NUMERIC;
  platform_fee NUMERIC;
  net_amount NUMERIC;
BEGIN
  -- ✅ Processar APENAS quando status é 'completed'
  IF (NEW.status = 'completed') 
     AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status)) THEN
    
    -- Buscar informações do produto
    SELECT user_id, name INTO product_record
    FROM public.products
    WHERE id = NEW.product_id;
    
    -- ✅ Verificar se já existem transações (evitar duplicatas)
    IF EXISTS (
      SELECT 1 FROM public.balance_transactions 
      WHERE order_id = NEW.order_id AND (type = 'platform_fee' OR type = 'sale_revenue')
    ) THEN
      RETURN NEW;
    END IF;
    
    -- Usar seller_commission se disponível, senão usar amount
    gross_amount := COALESCE(
      NULLIF(NEW.seller_commission::numeric, 0),
      NEW.amount::numeric
    );
    
    -- Calcular taxa da plataforma (8%)
    platform_fee := gross_amount * 0.08;
    net_amount := gross_amount - platform_fee;
    
    -- Registrar taxa da plataforma (débito)
    INSERT INTO public.balance_transactions (
      user_id,
      type,
      amount,
      currency,
      description,
      order_id
    ) VALUES (
      product_record.user_id,
      'platform_fee',
      -platform_fee,
      NEW.currency,
      'Taxa da plataforma Kambafy (8%)',
      NEW.order_id
    );
    
    -- Registrar receita de venda (crédito)
    INSERT INTO public.balance_transactions (
      user_id,
      type,
      amount,
      currency,
      description,
      order_id
    ) VALUES (
      product_record.user_id,
      'sale_revenue',
      net_amount,
      NEW.currency,
      'Receita de venda (valor líquido após taxa)',
      NEW.order_id
    );
    
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 4. Recalcular saldos de todos os usuários
DO $$
DECLARE
  user_record RECORD;
  correct_balance NUMERIC;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM balance_transactions 
    WHERE user_id IS NOT NULL
  LOOP
    -- Calcular saldo correto
    SELECT COALESCE(SUM(amount), 0) INTO correct_balance
    FROM balance_transactions
    WHERE user_id = user_record.user_id;
    
    -- Atualizar ou criar registro de saldo
    INSERT INTO customer_balances (user_id, balance, currency)
    VALUES (user_record.user_id, correct_balance, 'KZ')
    ON CONFLICT (user_id) DO UPDATE
    SET balance = correct_balance, updated_at = NOW();
  END LOOP;
END $$;
