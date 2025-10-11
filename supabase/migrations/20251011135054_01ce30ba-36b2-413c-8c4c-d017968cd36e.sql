-- Corrigir trigger para disparar também em UPDATE
DROP TRIGGER IF EXISTS create_balance_on_completed_sale ON orders;

-- Criar trigger que dispara em INSERT e UPDATE
CREATE TRIGGER create_balance_on_completed_sale
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_balance_transaction_on_sale();

-- Processar pedidos pending existentes sem taxa (últimos 30 dias)
DO $$
DECLARE
  order_record RECORD;
  product_record RECORD;
  gross_amount NUMERIC;
  platform_fee NUMERIC;
  net_amount NUMERIC;
BEGIN
  -- Iterar sobre pedidos pending sem taxa
  FOR order_record IN 
    SELECT DISTINCT o.* 
    FROM orders o
    LEFT JOIN balance_transactions bt ON bt.order_id = o.order_id AND bt.type = 'platform_fee'
    WHERE o.status IN ('completed', 'pending')
      AND o.created_at > now() - interval '30 days'
      AND bt.id IS NULL
      AND o.product_id IS NOT NULL
  LOOP
    -- Buscar informações do produto
    SELECT user_id, name INTO product_record
    FROM products
    WHERE id = order_record.product_id;
    
    -- Se não encontrou o produto, pular
    IF product_record.user_id IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Calcular valores
    gross_amount := COALESCE(
      NULLIF(order_record.seller_commission::numeric, 0),
      order_record.amount::numeric
    );
    
    platform_fee := gross_amount * 0.08;
    net_amount := gross_amount - platform_fee;
    
    -- Registrar taxa da plataforma (débito)
    INSERT INTO balance_transactions (
      user_id,
      type,
      amount,
      currency,
      description,
      order_id,
      created_at
    ) VALUES (
      product_record.user_id,
      'platform_fee',
      -platform_fee,
      order_record.currency,
      'Taxa da plataforma Kambafy (8%) - Correção retroativa',
      order_record.order_id,
      order_record.created_at
    );
    
    -- Registrar receita de venda (crédito) - SOMENTE para completed
    IF order_record.status = 'completed' THEN
      INSERT INTO balance_transactions (
        user_id,
        type,
        amount,
        currency,
        description,
        order_id,
        created_at
      ) VALUES (
        product_record.user_id,
        'sale_revenue',
        net_amount,
        order_record.currency,
        'Receita de venda (valor líquido após taxa) - Correção retroativa',
        order_record.order_id,
        order_record.created_at
      );
    END IF;
  END LOOP;
END $$;