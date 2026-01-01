-- Fix: credit correct currency wallet for sales using original_amount/original_currency + payment_method rules
-- This adds a BEFORE INSERT trigger on balance_transactions to normalize currency/amount for sale_revenue/platform_fee

CREATE OR REPLACE FUNCTION public.enforce_balance_transaction_currency_and_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o_payment_method text;
  o_currency text;
  o_original_currency text;
  o_amount numeric;
  o_original_amount numeric;
  inferred_currency text;
  gross_amount numeric;
  commission_rate numeric;
BEGIN
  -- Only normalize transactions tied to an order
  IF NEW.order_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only normalize sale crediting transactions
  IF NEW.type NOT IN ('sale_revenue', 'platform_fee') THEN
    RETURN NEW;
  END IF;

  SELECT
    payment_method,
    currency,
    original_currency,
    amount,
    original_amount
  INTO
    o_payment_method,
    o_currency,
    o_original_currency,
    o_amount,
    o_original_amount
  FROM public.orders
  WHERE order_id = NEW.order_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF o_payment_method IS NULL THEN
    RETURN NEW;
  END IF;

  -- Infer currency by payment method (business rule)
  inferred_currency := COALESCE(o_original_currency, o_currency, 'KZ');

  IF lower(o_payment_method) IN ('express', 'multicaixa_express', 'reference', 'bank_transfer', 'transfer', 'kambapay') THEN
    inferred_currency := 'KZ';
  ELSIF lower(o_payment_method) IN ('mpesa', 'emola', 'card_mz') THEN
    inferred_currency := 'MZN';
  END IF;

  -- Normalize AOA -> KZ
  IF inferred_currency = 'AOA' THEN
    inferred_currency := 'KZ';
  END IF;

  -- Decide which gross amount to use
  -- If original currency matches inferred currency, trust original_amount (customer paid amount)
  -- Otherwise (bad historical data), fall back to amount
  IF o_original_amount IS NOT NULL AND COALESCE(NULLIF(o_original_currency, ''), 'KZ') = inferred_currency THEN
    gross_amount := o_original_amount;
  ELSE
    gross_amount := COALESCE(o_amount, 0);
  END IF;

  -- Commission: Angola 8.99% (KZ methods), others 9.99%
  commission_rate := CASE WHEN inferred_currency = 'KZ' THEN 0.0899 ELSE 0.0999 END;

  NEW.currency := inferred_currency;

  IF NEW.type = 'sale_revenue' THEN
    NEW.amount := round(gross_amount * (1 - commission_rate), 8);
  ELSIF NEW.type = 'platform_fee' THEN
    NEW.amount := round(-(gross_amount * commission_rate), 8);
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger runs before other BEFORE INSERT triggers (Postgres runs them in name order)
DROP TRIGGER IF EXISTS a_enforce_balance_transaction_currency_and_amount ON public.balance_transactions;
CREATE TRIGGER a_enforce_balance_transaction_currency_and_amount
BEFORE INSERT ON public.balance_transactions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_balance_transaction_currency_and_amount();
