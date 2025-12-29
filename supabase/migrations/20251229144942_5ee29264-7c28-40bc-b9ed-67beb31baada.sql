-- =====================================================
-- COMMISSION RATES UPDATE: Dynamic rates by payment method
-- Angola methods: 8.99% platform fee (seller gets 91.01%)
-- Mozambique/International: 9.99% platform fee (seller gets 90.01%)
-- =====================================================

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trigger_balance_on_order_complete ON public.orders;

-- Recreate the function with dynamic commission rates
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
BEGIN
  -- Only process when order status changes to 'completed'
  IF (NEW.status = 'completed') 
     AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status)) THEN
    
    -- =====================================================
    -- DYNAMIC COMMISSION RATES BASED ON PAYMENT METHOD
    -- =====================================================
    -- Angola methods (8.99% fee): multicaixa_express, express, reference, 
    --   paypal_angola, bank_transfer_ao, kambapay, transfer, transferencia, bank_transfer
    -- All others (9.99% fee): Mozambique (mpesa, emola, card_mz), Stripe, etc.
    
    IF NEW.payment_method IN ('multicaixa_express', 'express', 'reference', 'paypal_angola', 
                               'bank_transfer_ao', 'kambapay', 'transfer', 'transferencia', 'bank_transfer') THEN
      commission_rate := 0.0899; -- 8.99% for Angola
      seller_rate := 0.9101;     -- 91.01% for seller
    ELSE
      commission_rate := 0.0999; -- 9.99% for Mozambique/International
      seller_rate := 0.9001;     -- 90.01% for seller
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
    
    -- Calculate net amount using seller_commission if available
    -- Otherwise calculate from gross amount
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
        -- Use affiliate_commission from order if available
        affiliate_commission := COALESCE(
          NULLIF(NEW.affiliate_commission::numeric, 0),
          (NEW.amount::numeric * (REPLACE(affiliate_record.commission_rate, '%', '')::numeric / 100))
        );
        
        -- Calculate seller final amount (after affiliate commission)
        seller_final_amount := net_amount - affiliate_commission;
        
        -- Create platform fee transaction (negative)
        INSERT INTO public.balance_transactions (
          user_id,
          type,
          amount,
          currency,
          description,
          order_id
        ) VALUES (
          product_record.user_id,
          'platform_fee',
          -(NEW.amount::numeric * commission_rate),
          COALESCE(NEW.currency, 'KZ'),
          'Taxa da plataforma (' || (commission_rate * 100)::text || '%) - ' || product_record.name,
          NEW.order_id
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
          product_record.user_id,
          'sale_revenue',
          seller_final_amount,
          COALESCE(NEW.currency, 'KZ'),
          'Venda (após taxa e comissão afiliado) - ' || product_record.name,
          NEW.order_id
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
          affiliate_commission,
          COALESCE(NEW.currency, 'KZ'),
          'Comissão de afiliado - ' || product_record.name,
          NEW.order_id
        );
        
        RAISE NOTICE 'Created affiliate sale transactions for order: %, seller: %, affiliate: %',
          NEW.order_id, seller_final_amount, affiliate_commission;
      ELSE
        -- Affiliate not found or not approved, process as normal sale
        RAISE NOTICE 'Affiliate code % not found or not approved, processing as normal sale', NEW.affiliate_code;
        
        -- Create platform fee transaction
        INSERT INTO public.balance_transactions (
          user_id,
          type,
          amount,
          currency,
          description,
          order_id
        ) VALUES (
          product_record.user_id,
          'platform_fee',
          -(NEW.amount::numeric * commission_rate),
          COALESCE(NEW.currency, 'KZ'),
          'Taxa da plataforma (' || (commission_rate * 100)::text || '%) - ' || product_record.name,
          NEW.order_id
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
          product_record.user_id,
          'sale_revenue',
          net_amount,
          COALESCE(NEW.currency, 'KZ'),
          'Venda (após taxa) - ' || product_record.name,
          NEW.order_id
        );
      END IF;
    ELSE
      -- Normal sale (no affiliate)
      
      -- Create platform fee transaction (negative)
      INSERT INTO public.balance_transactions (
        user_id,
        type,
        amount,
        currency,
        description,
        order_id
      ) VALUES (
        product_record.user_id,
        'platform_fee',
        -(NEW.amount::numeric * commission_rate),
        COALESCE(NEW.currency, 'KZ'),
        'Taxa da plataforma (' || (commission_rate * 100)::text || '%) - ' || product_record.name,
        NEW.order_id
      );
      
      -- Create seller revenue transaction (positive)
      INSERT INTO public.balance_transactions (
        user_id,
        type,
        amount,
        currency,
        description,
        order_id
      ) VALUES (
        product_record.user_id,
        'sale_revenue',
        net_amount,
        COALESCE(NEW.currency, 'KZ'),
        'Venda (após taxa) - ' || product_record.name,
        NEW.order_id
      );
      
      RAISE NOTICE 'Created sale transactions for order: %, net_amount: %, commission_rate: %', 
        NEW.order_id, net_amount, commission_rate;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER trigger_balance_on_order_complete
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_balance_transaction_on_sale();

-- Also update the module payment trigger to use 9.99% (Mozambique)
CREATE OR REPLACE FUNCTION public.create_balance_transaction_on_module_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  member_area_record RECORD;
  net_amount NUMERIC;
  existing_count INTEGER;
  platform_fee NUMERIC;
BEGIN
  -- Only process when payment status changes to 'completed'
  IF (NEW.status = 'completed') 
     AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status)) THEN
    
    -- Fetch member area to get owner (seller)
    SELECT * INTO member_area_record
    FROM public.member_areas
    WHERE id = NEW.member_area_id;
    
    IF NOT FOUND THEN
      RAISE NOTICE 'Member area not found for module payment: %', NEW.id;
      RETURN NEW;
    END IF;
    
    -- Check if transactions already exist
    SELECT COUNT(*) INTO existing_count
    FROM public.balance_transactions
    WHERE order_id = NEW.order_id
      AND type IN ('platform_fee', 'sale_revenue');
    
    IF existing_count > 0 THEN
      RAISE NOTICE 'Transactions already exist for module payment: %, skipping', NEW.order_id;
      RETURN NEW;
    END IF;
    
    -- Module payments are typically for courses (can be Angola or Mozambique)
    -- Default to 8% for modules to keep existing behavior
    -- (You can adjust this based on payment_method if needed)
    platform_fee := NEW.amount::numeric * 0.08;
    net_amount := NEW.amount::numeric * 0.92;
    
    -- Create platform fee transaction (negative)
    INSERT INTO public.balance_transactions (
      user_id,
      type,
      amount,
      currency,
      description,
      order_id
    ) VALUES (
      member_area_record.user_id,
      'platform_fee',
      -platform_fee,
      COALESCE(NEW.currency, 'KZ'),
      'Taxa da plataforma (8%) - Módulo',
      NEW.order_id
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
      member_area_record.user_id,
      'sale_revenue',
      net_amount,
      COALESCE(NEW.currency, 'KZ'),
      'Venda de módulo (após taxa)',
      NEW.order_id
    );
    
    RAISE NOTICE 'Created module payment transactions for order: %, net_amount: %', 
      NEW.order_id, net_amount;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Add comment documenting the commission rates
COMMENT ON FUNCTION public.create_balance_transaction_on_sale() IS 
'Creates balance transactions when order is completed. 
Commission rates:
- Angola methods (multicaixa_express, express, reference, etc.): 8.99%
- Mozambique/International (mpesa, emola, card_mz, Stripe): 9.99%';