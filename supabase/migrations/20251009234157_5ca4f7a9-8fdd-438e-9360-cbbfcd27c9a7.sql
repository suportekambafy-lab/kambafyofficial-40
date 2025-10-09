
-- Criar função temporária para inserir apenas transações novas
DO $$
DECLARE
  order_record RECORD;
  rows_inserted INTEGER := 0;
BEGIN
  FOR order_record IN 
    SELECT 
      o.order_id,
      o.amount::numeric as amount,
      o.currency,
      prod.name as product_name
    FROM orders o
    JOIN products prod ON prod.id = o.product_id
    WHERE prod.user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
    AND o.status = 'completed'
    AND NOT EXISTS (
      SELECT 1 FROM balance_transactions bt
      WHERE bt.user_id = 'a349acdf-584c-441e-adf8-d4bbfe217254'
      AND bt.order_id = o.order_id
      AND bt.type = 'credit'
    )
  LOOP
    BEGIN
      INSERT INTO balance_transactions (
        user_id,
        type,
        amount,
        currency,
        description,
        order_id,
        created_at
      ) VALUES (
        'a349acdf-584c-441e-adf8-d4bbfe217254'::uuid,
        'credit',
        order_record.amount,
        order_record.currency,
        'Liberação de saldo - ' || order_record.product_name,
        order_record.order_id,
        NOW()
      );
      rows_inserted := rows_inserted + 1;
    EXCEPTION 
      WHEN unique_violation THEN
        -- Ignorar duplicatas silenciosamente
        NULL;
    END;
  END LOOP;
  
  RAISE NOTICE 'Liberadas % vendas para Victor Muabi', rows_inserted;
END $$;
