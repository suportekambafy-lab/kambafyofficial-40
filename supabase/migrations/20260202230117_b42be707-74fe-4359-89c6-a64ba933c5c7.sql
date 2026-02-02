-- ============================================================================
-- FIX: Update create_balance_transaction_on_sale to recognize status='ativo'
-- The trigger was looking for status='approved' but affiliates use 'ativo'
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_balance_transaction_on_sale()
RETURNS TRIGGER AS $$
DECLARE
  seller_user_id UUID;
  product_record RECORD;
  affiliate_record RECORD;
  gross_amount NUMERIC;
  platform_fee_rate NUMERIC;
  platform_fee_amount NUMERIC;
  affiliate_commission_amount NUMERIC;
  seller_final_amount NUMERIC;
  net_after_affiliate NUMERIC;
  existing_count INTEGER;
  order_currency TEXT;
BEGIN
  -- Only process when order status changes to 'completed'
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;
  
  -- Check if we already processed this order (idempotency)
  SELECT COUNT(*) INTO existing_count
  FROM public.balance_transactions
  WHERE order_id = NEW.id;
  
  IF existing_count > 0 THEN
    RAISE NOTICE 'Balance transactions already exist for order %, skipping', NEW.id;
    RETURN NEW;
  END IF;

  RAISE NOTICE 'Processing balance transactions for order %', NEW.id;

  -- Fetch product details to get seller's user_id
  SELECT * INTO product_record
  FROM public.products
  WHERE id = NEW.product_id;

  IF product_record IS NULL THEN
    RAISE NOTICE 'Product not found for order %, skipping balance transaction', NEW.id;
    RETURN NEW;
  END IF;

  seller_user_id := product_record.user_id;
  gross_amount := COALESCE(NEW.amount::NUMERIC, 0);
  order_currency := COALESCE(NEW.currency, 'KZ');

  -- Skip if gross amount is 0 or negative
  IF gross_amount <= 0 THEN
    RAISE NOTICE 'Invalid gross amount % for order %, skipping', gross_amount, NEW.id;
    RETURN NEW;
  END IF;

  -- Determine platform fee rate based on payment method
  -- Angola methods: 8.99%, Others: 9.99%
  IF NEW.payment_method IN ('multicaixa_express', 'express', 'reference', 'paypal_angola', 'bank_transfer_ao', 'kambapay', 'transfer', 'transferencia', 'bank_transfer') THEN
    platform_fee_rate := 0.0899;
  ELSE
    platform_fee_rate := 0.0999;
  END IF;

  -- ========================================
  -- Check for affiliate sale
  -- ========================================
  IF NEW.affiliate_code IS NOT NULL AND NEW.affiliate_code != '' THEN
    RAISE NOTICE 'Order % has affiliate_code: %', NEW.id, NEW.affiliate_code;
    
    -- Fetch affiliate details
    -- FIX: Use 'ativo' status (the actual status used in the system) instead of 'approved'
    SELECT * INTO affiliate_record
    FROM public.affiliates
    WHERE affiliate_code = NEW.affiliate_code
      AND product_id = NEW.product_id
      AND status IN ('ativo', 'approved')  -- Support both for compatibility
    LIMIT 1;

    IF affiliate_record IS NOT NULL THEN
      RAISE NOTICE 'Valid affiliate found: user_id=%, commission_rate=%', 
        affiliate_record.affiliate_user_id, affiliate_record.commission_rate;
      
      -- Calculate affiliate commission
      -- Use the commission from the order if already calculated, otherwise calculate it
      IF NEW.affiliate_commission IS NOT NULL AND NEW.affiliate_commission > 0 THEN
        affiliate_commission_amount := NEW.affiliate_commission;
        RAISE NOTICE 'Using pre-calculated affiliate commission: %', affiliate_commission_amount;
      ELSE
        -- Parse commission rate (e.g., "90%" -> 0.90)
        DECLARE
          rate_decimal NUMERIC;
        BEGIN
          rate_decimal := COALESCE(
            NULLIF(REPLACE(affiliate_record.commission_rate, '%', ''), '')::NUMERIC / 100,
            0.10
          );
          affiliate_commission_amount := ROUND(gross_amount * rate_decimal, 2);
          RAISE NOTICE 'Calculated affiliate commission: % * % = %', gross_amount, rate_decimal, affiliate_commission_amount;
        END;
      END IF;

      -- Calculate net after affiliate commission
      net_after_affiliate := gross_amount - affiliate_commission_amount;
      
      -- Calculate platform fee on net (after affiliate commission)
      platform_fee_amount := ROUND(net_after_affiliate * platform_fee_rate, 2);
      
      -- Calculate seller's final amount
      seller_final_amount := net_after_affiliate - platform_fee_amount;

      RAISE NOTICE 'Commission breakdown: gross=%, affiliate=%, net_after_affiliate=%, platform_fee=%, seller=%, currency=%',
        gross_amount, affiliate_commission_amount, net_after_affiliate, platform_fee_amount, seller_final_amount, order_currency;

      -- Create platform fee transaction (negative for seller - it's a deduction)
      INSERT INTO public.balance_transactions (
        user_id,
        type,
        amount,
        currency,
        description,
        order_id
      ) VALUES (
        seller_user_id,
        'platform_fee',
        -platform_fee_amount,
        order_currency,
        'Taxa da plataforma - Pedido ' || NEW.order_id,
        NEW.id
      );

      -- Create seller revenue transaction
      INSERT INTO public.balance_transactions (
        user_id,
        type,
        amount,
        currency,
        description,
        order_id
      ) VALUES (
        seller_user_id,
        'sale_revenue',
        seller_final_amount,
        order_currency,
        'Receita de venda - Pedido ' || NEW.order_id,
        NEW.id
      );

      -- Create affiliate commission transaction
      INSERT INTO public.balance_transactions (
        user_id,
        type,
        amount,
        currency,
        description,
        order_id
      ) VALUES (
        affiliate_record.affiliate_user_id,
        'affiliate_commission',
        affiliate_commission_amount,
        order_currency,
        'Comissão de afiliado - Pedido ' || NEW.order_id,
        NEW.id
      );

      RAISE NOTICE 'Created 3 balance transactions for affiliate sale: platform_fee=%, sale_revenue=%, affiliate_commission=%',
        platform_fee_amount, seller_final_amount, affiliate_commission_amount;

    ELSE
      RAISE NOTICE 'Affiliate code % not found or not active for product %, treating as direct sale', 
        NEW.affiliate_code, NEW.product_id;
      -- Fall through to direct sale logic below
      NEW.affiliate_code := NULL;
    END IF;
  END IF;

  -- ========================================
  -- Normal sale (no affiliate or affiliate not found)
  -- ========================================
  IF NEW.affiliate_code IS NULL OR NEW.affiliate_code = '' THEN
    RAISE NOTICE 'Processing as direct sale (no affiliate)';
    
    -- Calculate platform fee
    platform_fee_amount := ROUND(gross_amount * platform_fee_rate, 2);
    
    -- Use seller_commission if already calculated, otherwise calculate
    IF NEW.seller_commission IS NOT NULL AND NEW.seller_commission > 0 THEN
      seller_final_amount := NEW.seller_commission;
      -- Recalculate platform fee to match
      platform_fee_amount := gross_amount - seller_final_amount;
      RAISE NOTICE 'Using pre-calculated seller commission: %', seller_final_amount;
    ELSE
      seller_final_amount := gross_amount - platform_fee_amount;
      RAISE NOTICE 'Calculated seller amount: % - % = %', gross_amount, platform_fee_amount, seller_final_amount;
    END IF;

    -- Create platform fee transaction
    INSERT INTO public.balance_transactions (
      user_id,
      type,
      amount,
      currency,
      description,
      order_id
    ) VALUES (
      seller_user_id,
      'platform_fee',
      -platform_fee_amount,
      order_currency,
      'Taxa da plataforma - Pedido ' || NEW.order_id,
      NEW.id
    );

    -- Create seller revenue transaction
    INSERT INTO public.balance_transactions (
      user_id,
      type,
      amount,
      currency,
      description,
      order_id
    ) VALUES (
      seller_user_id,
      'sale_revenue',
      seller_final_amount,
      order_currency,
      'Receita de venda - Pedido ' || NEW.order_id,
      NEW.id
    );

    RAISE NOTICE 'Created 2 balance transactions for direct sale: platform_fee=%, sale_revenue=%',
      platform_fee_amount, seller_final_amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure trigger exists (drop and recreate to be safe)
DROP TRIGGER IF EXISTS create_balance_transaction_on_sale_trigger ON public.orders;

CREATE TRIGGER create_balance_transaction_on_sale_trigger
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed')
  EXECUTE FUNCTION public.create_balance_transaction_on_sale();