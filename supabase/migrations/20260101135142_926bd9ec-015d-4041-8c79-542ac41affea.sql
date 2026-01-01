-- =====================================================
-- FIX: Corrigir cobrança dupla de taxa da plataforma
-- =====================================================
-- PROBLEMA: O trigger estava aplicando a comissão 2x:
--   1. sale_revenue = bruto * 0.9001 (já descontado)
--   2. platform_fee = bruto * -0.0999 (desconto adicional)
-- SOLUÇÃO: sale_revenue = BRUTO, platform_fee = única dedução

-- 1. Corrigir o trigger para NÃO aplicar taxa no sale_revenue
CREATE OR REPLACE FUNCTION public.enforce_balance_transaction_currency_and_amount()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  order_record RECORD;
  inferred_currency TEXT;
  gross_amount NUMERIC;
  commission_rate NUMERIC;
  angola_methods TEXT[] := ARRAY['express', 'reference', 'bank_transfer', 'multicaixa', 'unitel_money', 'afrimoney', 'paypay'];
  mozambique_methods TEXT[] := ARRAY['mpesa', 'emola', 'mkesh', 'ponto24'];
BEGIN
  -- Only process sale_revenue and platform_fee types
  IF NEW.type NOT IN ('sale_revenue', 'platform_fee') THEN
    RETURN NEW;
  END IF;

  -- Get order details
  IF NEW.order_id IS NOT NULL THEN
    SELECT 
      o.payment_method,
      o.original_currency,
      o.currency,
      COALESCE(o.original_amount::numeric, o.amount::numeric) as gross_amount
    INTO order_record
    FROM orders o
    WHERE o.order_id = NEW.order_id;

    IF order_record IS NOT NULL THEN
      -- Determine currency based on payment method
      IF order_record.payment_method = ANY(angola_methods) THEN
        inferred_currency := 'KZ';
        commission_rate := 0.0899; -- 8.99% for Angola
      ELSIF order_record.payment_method = ANY(mozambique_methods) THEN
        inferred_currency := 'MZN';
        commission_rate := 0.0999; -- 9.99% for Mozambique
      ELSIF order_record.payment_method IN ('stripe', 'card') THEN
        -- For Stripe, use original_currency or currency
        inferred_currency := COALESCE(order_record.original_currency, order_record.currency, 'EUR');
        commission_rate := 0.0999; -- 9.99% for international
      ELSE
        inferred_currency := COALESCE(order_record.original_currency, order_record.currency, 'KZ');
        commission_rate := CASE WHEN inferred_currency = 'KZ' THEN 0.0899 ELSE 0.0999 END;
      END IF;

      gross_amount := order_record.gross_amount;

      -- Set currency
      NEW.currency := inferred_currency;

      -- FIXED: sale_revenue = BRUTO (sem desconto)
      -- platform_fee = única dedução da taxa
      IF NEW.type = 'sale_revenue' THEN
        -- Sale revenue is the GROSS amount (no commission applied here)
        NEW.amount := round(gross_amount, 2);
      ELSIF NEW.type = 'platform_fee' THEN
        -- Platform fee is the ONLY place where commission is deducted
        NEW.amount := round(-(gross_amount * commission_rate), 2);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Corrigir transações EUR existentes (sale_revenue estava com valor líquido)
-- Atualizar sale_revenue para o valor bruto
UPDATE balance_transactions bt
SET amount = COALESCE(
  (SELECT o.original_amount::numeric FROM orders o WHERE o.order_id = bt.order_id),
  (SELECT o.amount::numeric FROM orders o WHERE o.order_id = bt.order_id)
)
WHERE bt.currency = 'EUR' 
  AND bt.type = 'sale_revenue'
  AND bt.order_id IS NOT NULL;

-- 3. Também corrigir para outras moedas internacionais que podem ter o mesmo problema
UPDATE balance_transactions bt
SET amount = COALESCE(
  (SELECT o.original_amount::numeric FROM orders o WHERE o.order_id = bt.order_id),
  (SELECT o.amount::numeric FROM orders o WHERE o.order_id = bt.order_id)
)
WHERE bt.currency IN ('MZN', 'USD', 'GBP', 'BRL')
  AND bt.type = 'sale_revenue'
  AND bt.order_id IS NOT NULL;

-- 4. Recalcular todos os currency_balances
UPDATE currency_balances cb
SET 
  balance = COALESCE((
    SELECT SUM(amount)
    FROM balance_transactions bt
    WHERE bt.user_id = cb.user_id 
      AND bt.currency = cb.currency
  ), 0),
  updated_at = now();

-- 5. Log da correção
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO affected_count
  FROM balance_transactions
  WHERE type = 'sale_revenue' AND currency IN ('EUR', 'MZN', 'USD', 'GBP', 'BRL');
  
  RAISE NOTICE 'Corrigidas % transações sale_revenue internacionais', affected_count;
END $$;