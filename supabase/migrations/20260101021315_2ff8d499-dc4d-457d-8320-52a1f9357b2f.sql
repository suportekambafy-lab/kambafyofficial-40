-- Backfill: move sale_revenue/platform_fee transactions to the correct currency wallet
-- and recompute amounts based on orders.original_amount/original_currency + payment_method rules.

WITH order_fx AS (
  SELECT
    o.order_id,
    o.user_id,
    lower(coalesce(o.payment_method, '')) AS payment_method,
    COALESCE(o.currency, 'KZ') AS currency,
    COALESCE(o.original_currency, o.currency, 'KZ') AS original_currency,
    o.amount::numeric AS amount,
    NULLIF(o.original_amount::text, '')::numeric AS original_amount,
    -- infer currency by payment method
    CASE
      WHEN lower(coalesce(o.payment_method, '')) IN ('express','multicaixa_express','reference','bank_transfer','transfer','kambapay') THEN 'KZ'
      WHEN lower(coalesce(o.payment_method, '')) IN ('mpesa','emola','card_mz') THEN 'MZN'
      ELSE CASE WHEN COALESCE(o.original_currency, o.currency, 'KZ') = 'AOA' THEN 'KZ' ELSE COALESCE(o.original_currency, o.currency, 'KZ') END
    END AS inferred_currency
  FROM public.orders o
  WHERE o.status = 'completed'
),
order_amounts AS (
  SELECT
    ofx.*,
    CASE
      WHEN ofx.original_amount IS NOT NULL
       AND (CASE WHEN ofx.original_currency = 'AOA' THEN 'KZ' ELSE ofx.original_currency END) = ofx.inferred_currency
      THEN ofx.original_amount
      ELSE COALESCE(ofx.amount, 0)
    END AS gross_amount,
    CASE WHEN ofx.inferred_currency = 'KZ' THEN 0.0899 ELSE 0.0999 END AS commission_rate
  FROM order_fx ofx
),
updated AS (
  UPDATE public.balance_transactions bt
  SET
    currency = oa.inferred_currency,
    amount = CASE
      WHEN bt.type = 'sale_revenue' THEN round(oa.gross_amount * (1 - oa.commission_rate), 8)
      WHEN bt.type = 'platform_fee' THEN round(-(oa.gross_amount * oa.commission_rate), 8)
      ELSE bt.amount
    END
  FROM order_amounts oa
  WHERE bt.order_id = oa.order_id
    AND bt.user_id = oa.user_id
    AND bt.type IN ('sale_revenue','platform_fee')
  RETURNING bt.user_id
),
affected_users AS (
  SELECT DISTINCT user_id FROM updated
),
balances AS (
  SELECT bt.user_id, bt.currency, COALESCE(sum(bt.amount), 0) AS balance
  FROM public.balance_transactions bt
  WHERE bt.user_id IN (SELECT user_id FROM affected_users)
  GROUP BY bt.user_id, bt.currency
)
INSERT INTO public.currency_balances (user_id, currency, balance, retained_balance)
SELECT b.user_id, b.currency, b.balance, 0
FROM balances b
ON CONFLICT (user_id, currency)
DO UPDATE SET
  balance = EXCLUDED.balance,
  updated_at = now();
