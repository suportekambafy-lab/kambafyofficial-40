-- =====================================================
-- FIX: Reverter alterações incorretas em KZ e recalcular
-- =====================================================
-- O problema: A migração anterior tentou aplicar original_amount 
-- em transações que não deveria (EUR foi confundido com KZ, etc.)

-- 1. Para vendas KZ, sale_revenue deve ser: order_amount * 0.9101 (8.99% taxa)
-- Corrigir TODAS as transações sale_revenue KZ para valor líquido correto
UPDATE balance_transactions bt
SET amount = round(
  COALESCE(o.original_amount::numeric, o.amount::numeric) * 0.9101, 
  2
)
FROM orders o
WHERE o.order_id = bt.order_id
  AND bt.currency = 'KZ'
  AND bt.type = 'sale_revenue';

-- 2. Para vendas EUR/outras moedas internacionais, sale_revenue = BRUTO
-- (platform_fee é a única dedução)
UPDATE balance_transactions bt
SET amount = round(
  COALESCE(o.original_amount::numeric, o.amount::numeric), 
  2
)
FROM orders o
WHERE o.order_id = bt.order_id
  AND bt.currency IN ('EUR', 'MZN', 'USD', 'GBP', 'BRL')
  AND bt.type = 'sale_revenue';

-- 3. Corrigir platform_fee para KZ (8.99%)
UPDATE balance_transactions bt
SET amount = round(
  -(COALESCE(o.original_amount::numeric, o.amount::numeric) * 0.0899), 
  2
)
FROM orders o
WHERE o.order_id = bt.order_id
  AND bt.currency = 'KZ'
  AND bt.type = 'platform_fee';

-- 4. Corrigir platform_fee para moedas internacionais (9.99%)
UPDATE balance_transactions bt
SET amount = round(
  -(COALESCE(o.original_amount::numeric, o.amount::numeric) * 0.0999), 
  2
)
FROM orders o
WHERE o.order_id = bt.order_id
  AND bt.currency IN ('EUR', 'MZN', 'USD', 'GBP', 'BRL')
  AND bt.type = 'platform_fee';

-- 5. Recalcular TODOS os currency_balances
UPDATE currency_balances cb
SET 
  balance = COALESCE((
    SELECT SUM(amount)
    FROM balance_transactions bt
    WHERE bt.user_id = cb.user_id 
      AND bt.currency = cb.currency
  ), 0),
  updated_at = now();

-- 6. Verificar resultado
SELECT currency, SUM(balance) as total_balance
FROM currency_balances
GROUP BY currency
ORDER BY currency;