-- Create RPC to calculate seller gamification total in KZ (gross revenue score)
-- Uses auth.uid() to ensure sellers can only access their own totals

CREATE OR REPLACE FUNCTION public.get_my_gamification_total_kz()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH my_products AS (
  SELECT id
  FROM public.products
  WHERE user_id = auth.uid()
),
orders_src AS (
  SELECT
    o.amount,
    o.currency,
    o.payment_method,
    o.original_amount,
    o.original_currency
  FROM public.orders o
  WHERE o.product_id IN (SELECT id FROM my_products)
    AND o.status = 'completed'
    AND COALESCE(o.payment_method, '') <> 'member_access'
),
normalized AS (
  SELECT
    lower(COALESCE(payment_method, '')) AS pm,
    COALESCE(NULLIF(amount::text, ''), '0')::numeric AS amount_num,
    COALESCE(NULLIF(original_amount::text, ''), '0')::numeric AS orig_amount_num,
    CASE
      WHEN upper(COALESCE(original_currency, '')) IN ('AOA', 'AKZ') THEN 'KZ'
      ELSE upper(COALESCE(original_currency, ''))
    END AS orig_cur,
    CASE
      WHEN upper(COALESCE(currency, '')) IN ('AOA', 'AKZ') THEN 'KZ'
      ELSE upper(COALESCE(currency, ''))
    END AS cur
  FROM orders_src
),
actuals AS (
  SELECT
    pm,
    amount_num,
    orig_amount_num,
    orig_cur,
    cur,
    CASE
      WHEN pm = ANY(ARRAY['express','multicaixa_express','reference','bank_transfer','transfer','kambapay']) THEN 'KZ'
      WHEN pm = ANY(ARRAY['mpesa','emola','card_mz']) THEN 'MZN'
      WHEN pm = ANY(ARRAY['multibanco','mbway','klarna','klarna_uk','card','card_uk','apple_pay','google_pay']) THEN
        CASE
          WHEN orig_cur <> '' AND orig_cur <> 'KZ' THEN orig_cur
          WHEN cur <> '' AND cur <> 'KZ' THEN cur
          ELSE 'KZ'
        END
      ELSE
        CASE
          WHEN orig_cur <> '' THEN orig_cur
          WHEN cur <> '' THEN cur
          ELSE 'KZ'
        END
    END AS actual_currency
  FROM normalized
),
amounts AS (
  SELECT
    actual_currency,
    CASE
      WHEN pm = ANY(ARRAY['multibanco','mbway','klarna','klarna_uk','card','card_uk','apple_pay','google_pay']) THEN
        CASE WHEN orig_amount_num > 0 THEN orig_amount_num ELSE amount_num END
      ELSE
        CASE
          WHEN orig_amount_num > 0 AND orig_cur = actual_currency THEN orig_amount_num
          ELSE amount_num
        END
    END AS actual_amount
  FROM actuals
)
SELECT COALESCE(
  SUM(
    CASE actual_currency
      WHEN 'EUR' THEN round(actual_amount * 1053)
      WHEN 'MZN' THEN round(actual_amount * 14.3)
      WHEN 'USD' THEN round(actual_amount * 900)
      WHEN 'GBP' THEN round(actual_amount * 1250)
      WHEN 'BRL' THEN round(actual_amount * 180)
      ELSE round(actual_amount)
    END
  ),
  0
)
FROM amounts;
$$;
