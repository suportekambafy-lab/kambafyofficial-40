
-- Criar função para processar acessos faltantes (correção de bug)
CREATE OR REPLACE FUNCTION process_missing_customer_access()
RETURNS TABLE (
  processed_count INTEGER,
  details JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_product RECORD;
  v_expiration TIMESTAMP WITH TIME ZONE;
  v_processed INTEGER := 0;
  v_details JSONB := '[]'::JSONB;
BEGIN
  -- Buscar pedidos completados sem acesso nas últimas 48h
  FOR v_order IN 
    SELECT o.*
    FROM orders o
    WHERE o.status = 'completed'
      AND o.created_at >= NOW() - INTERVAL '48 hours'
      AND NOT EXISTS (
        SELECT 1 FROM customer_access ca 
        WHERE ca.order_id = o.order_id
      )
  LOOP
    BEGIN
      -- Buscar dados do produto
      SELECT * INTO v_product 
      FROM products 
      WHERE id = v_order.product_id;
      
      IF NOT FOUND THEN
        CONTINUE;
      END IF;
      
      -- Calcular expiração
      IF v_product.access_duration_type = 'lifetime' OR v_product.access_duration_type IS NULL THEN
        v_expiration := NULL;
      ELSIF v_product.access_duration_type = 'days' THEN
        v_expiration := NOW() + (v_product.access_duration_value || ' days')::INTERVAL;
      ELSIF v_product.access_duration_type = 'months' THEN
        v_expiration := NOW() + (v_product.access_duration_value || ' months')::INTERVAL;
      ELSIF v_product.access_duration_type = 'years' THEN
        v_expiration := NOW() + (v_product.access_duration_value || ' years')::INTERVAL;
      ELSE
        v_expiration := NULL;
      END IF;
      
      -- Criar acesso
      INSERT INTO customer_access (
        customer_email,
        customer_name,
        product_id,
        order_id,
        access_expires_at,
        is_active
      ) VALUES (
        LOWER(TRIM(v_order.customer_email)),
        v_order.customer_name,
        v_order.product_id,
        v_order.order_id,
        v_expiration,
        true
      )
      ON CONFLICT (order_id) DO NOTHING;
      
      v_processed := v_processed + 1;
      v_details := v_details || jsonb_build_object(
        'order_id', v_order.order_id,
        'email', v_order.customer_email,
        'product_name', v_product.name
      );
      
    EXCEPTION WHEN OTHERS THEN
      -- Registrar erro mas continuar processando
      v_details := v_details || jsonb_build_object(
        'order_id', v_order.order_id,
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_processed, v_details;
END;
$$;

-- Executar a função para processar acessos faltantes AGORA
SELECT * FROM process_missing_customer_access();
