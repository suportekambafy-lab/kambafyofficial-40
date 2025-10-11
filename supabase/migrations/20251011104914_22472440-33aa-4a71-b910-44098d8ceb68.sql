-- Limpar registros órfãos de payment_releases
-- (releases registrados mas sem sale_revenue correspondente)

DELETE FROM payment_releases pr
WHERE NOT EXISTS (
  SELECT 1 
  FROM balance_transactions bt
  WHERE bt.order_id = pr.order_id
    AND bt.type = 'sale_revenue'
);