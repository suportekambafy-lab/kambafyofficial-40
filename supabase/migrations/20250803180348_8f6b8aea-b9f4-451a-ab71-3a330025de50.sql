-- Corrigir vendas existentes com afiliados que têm comissão NULL
-- Atualizar vendas que têm affiliate_code mas affiliate_commission é NULL

DO $$
DECLARE
    order_record RECORD;
    affiliate_rate TEXT;
    commission_decimal NUMERIC;
    total_amount NUMERIC;
    affiliate_comm NUMERIC;
    seller_comm NUMERIC;
BEGIN
    -- Iterar sobre vendas com affiliate_code mas sem comissão calculada
    FOR order_record IN
        SELECT o.id, o.amount, o.affiliate_code, o.product_id
        FROM orders o
        WHERE o.affiliate_code IS NOT NULL 
        AND o.affiliate_commission IS NULL
    LOOP
        -- Buscar a taxa de comissão do afiliado
        SELECT a.commission_rate INTO affiliate_rate
        FROM affiliates a
        WHERE a.affiliate_code = order_record.affiliate_code
        AND a.product_id = order_record.product_id
        AND a.status = 'ativo'
        LIMIT 1;
        
        -- Se encontrou a taxa de comissão, calcular e atualizar
        IF affiliate_rate IS NOT NULL THEN
            commission_decimal := (REPLACE(affiliate_rate, '%', '')::NUMERIC) / 100;
            total_amount := order_record.amount::NUMERIC;
            affiliate_comm := ROUND(total_amount * commission_decimal, 2);
            seller_comm := total_amount - affiliate_comm;
            
            -- Atualizar o pedido
            UPDATE orders 
            SET 
                affiliate_commission = affiliate_comm,
                seller_commission = seller_comm
            WHERE id = order_record.id;
            
            RAISE NOTICE 'Atualizado pedido %: Total=%, Afiliado=%, Vendedor=%', 
                order_record.id, total_amount, affiliate_comm, seller_comm;
        ELSE
            -- Se não encontrou afiliado ativo, vendedor recebe tudo
            UPDATE orders 
            SET seller_commission = amount::NUMERIC
            WHERE id = order_record.id;
            
            RAISE NOTICE 'Pedido % sem afiliado ativo, vendedor recebe tudo', order_record.id;
        END IF;
    END LOOP;
END $$;