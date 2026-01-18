-- Update create_balance_transaction_on_sale to pass is_affiliate_sale to process_coproducer_commissions
CREATE OR REPLACE FUNCTION public.create_balance_transaction_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  product_record RECORD;
  affiliate_record RECORD;
  net_amount NUMERIC;
  commission_rate NUMERIC;
  seller_rate NUMERIC;
  affiliate_commission NUMERIC;
  seller_final_amount NUMERIC;
  existing_count INTEGER;
  is_affiliate_sale BOOLEAN := FALSE;
BEGIN
  -- Only process when order status changes to 'completed'
  IF (NEW.status = 'completed') 
     AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status)) THEN
    
    -- =====================================================
    -- DYNAMIC COMMISSION RATES BASED ON PAYMENT METHOD
    -- =====================================================
    IF NEW.payment_method IN ('multicaixa_express', 'express', 'reference', 'paypal_angola', 
                               'bank_transfer_ao', 'kambapay', 'transfer', 'transferencia', 'bank_transfer') THEN
      commission_rate := 0.0899;
      seller_rate := 0.9101;
    ELSE
      commission_rate := 0.0999;
      seller_rate := 0.9001;
    END IF;

    -- Fetch product details
    SELECT * INTO product_record
    FROM public.products
    WHERE id = NEW.product_id;
    
    IF NOT FOUND THEN
      RAISE NOTICE 'Product not found for order: %', NEW.order_id;
      RETURN NEW;
    END IF;
    
    -- Check if transactions already exist for this order
    SELECT COUNT(*) INTO existing_count
    FROM public.balance_transactions
    WHERE order_id = NEW.order_id
      AND type IN ('platform_fee', 'sale_revenue', 'affiliate_commission');
    
    IF existing_count > 0 THEN
      RAISE NOTICE 'Transactions already exist for order: %, skipping', NEW.order_id;
      RETURN NEW;
    END IF;
    
    -- Calculate net amount
    net_amount := COALESCE(
      NULLIF(NEW.seller_commission::numeric, 0),
      (NEW.amount::numeric * seller_rate)
    );
    
    -- Check if this is an affiliate sale
    IF NEW.affiliate_code IS NOT NULL AND NEW.affiliate_code != '' THEN
      -- Fetch affiliate details
      SELECT * INTO affiliate_record
      FROM public.affiliates
      WHERE affiliate_code = NEW.affiliate_code
        AND product_id = NEW.product_id
        AND status = 'approved'
      LIMIT 1;
      
      IF FOUND THEN
        is_affiliate_sale := TRUE;
        
        -- Use affiliate_commission from order if available
        affiliate_commission := COALESCE(
          NULLIF(NEW.affiliate_commission::numeric, 0),
          (NEW.amount::numeric * (REPLACE(affiliate_record.commission_rate, '%', '')::numeric / 100))
        );
        
        -- Calculate seller final amount (after affiliate commission)
        seller_final_amount := net_amount - affiliate_commission;
        
        -- Create platform fee transaction (negative)
        INSERT INTO public.balance_transactions (
          user_id, type, amount, currency, description, order_id
        ) VALUES (
          product_record.user_id,
          'platform_fee',
          -(NEW.amount::numeric * commission_rate),
          COALESCE(NEW.currency, 'KZ'),
          'Taxa da plataforma (' || (commission_rate * 100)::text || '%) - ' || product_record.name,
          NEW.order_id
        );
        
        -- Process coproducer commissions BEFORE crediting seller (pass is_affiliate_sale = TRUE)
        seller_final_amount := public.process_coproducer_commissions(
          NEW.order_id,
          NEW.product_id,
          seller_final_amount,
          COALESCE(NEW.currency, 'KZ'),
          product_record.name,
          TRUE  -- is_affiliate_sale
        );
        
        -- Create seller revenue transaction
        INSERT INTO public.balance_transactions (
          user_id, type, amount, currency, description, order_id
        ) VALUES (
          product_record.user_id,
          'sale_revenue',
          seller_final_amount,
          COALESCE(NEW.currency, 'KZ'),
          'Venda (após taxa e comissão afiliado) - ' || product_record.name,
          NEW.order_id
        );
        
        -- Create affiliate commission transaction
        INSERT INTO public.balance_transactions (
          user_id, type, amount, currency, description, order_id
        ) VALUES (
          affiliate_record.affiliate_user_id,
          'affiliate_commission',
          affiliate_commission,
          COALESCE(NEW.currency, 'KZ'),
          'Comissão de afiliado - ' || product_record.name,
          NEW.order_id
        );
        
        RAISE LOG '[Balance] Affiliate sale: order=%, seller gets %, affiliate gets %', 
          NEW.order_id, seller_final_amount, affiliate_commission;
      END IF;
    END IF;
    
    -- If not an affiliate sale (no affiliate found), process as normal sale
    IF NOT is_affiliate_sale THEN
      -- Create platform fee transaction (negative)
      INSERT INTO public.balance_transactions (
        user_id, type, amount, currency, description, order_id
      ) VALUES (
        product_record.user_id,
        'platform_fee',
        -(NEW.amount::numeric * commission_rate),
        COALESCE(NEW.currency, 'KZ'),
        'Taxa da plataforma (' || (commission_rate * 100)::text || '%) - ' || product_record.name,
        NEW.order_id
      );
      
      -- Process coproducer commissions BEFORE crediting seller (pass is_affiliate_sale = FALSE)
      net_amount := public.process_coproducer_commissions(
        NEW.order_id,
        NEW.product_id,
        net_amount,
        COALESCE(NEW.currency, 'KZ'),
        product_record.name,
        FALSE  -- is_affiliate_sale
      );
      
      -- Create seller revenue transaction
      INSERT INTO public.balance_transactions (
        user_id, type, amount, currency, description, order_id
      ) VALUES (
        product_record.user_id,
        'sale_revenue',
        net_amount,
        COALESCE(NEW.currency, 'KZ'),
        'Venda - ' || product_record.name,
        NEW.order_id
      );
      
      RAISE LOG '[Balance] Direct sale: order=%, seller gets %', NEW.order_id, net_amount;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;