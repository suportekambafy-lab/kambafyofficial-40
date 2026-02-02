-- Fix the type mismatch in create_balance_transaction_on_sale trigger
-- The issue: comparing balance_transactions.order_id (text) with NEW.id (uuid)

CREATE OR REPLACE FUNCTION public.create_balance_transaction_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_count integer;
  seller_email text;
  affiliate_record record;
  platform_fee_amount numeric;
  seller_net_amount numeric;
  affiliate_commission_amount numeric;
BEGIN
  -- Only process completed orders
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Check if transactions already exist for this order (using text comparison)
  SELECT COUNT(*) INTO existing_count 
  FROM balance_transactions 
  WHERE order_id = NEW.id::text;

  IF existing_count > 0 THEN
    RETURN NEW;
  END IF;

  -- Get seller email
  SELECT email INTO seller_email 
  FROM auth.users 
  WHERE id = NEW.user_id;

  IF seller_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate amounts based on what's stored in the order
  -- seller_commission already contains the NET value for the seller
  seller_net_amount := COALESCE(NEW.seller_commission, 0);
  affiliate_commission_amount := COALESCE(NEW.affiliate_commission, 0);
  
  -- Platform fee = gross - affiliate_commission - seller_net
  platform_fee_amount := NEW.amount - affiliate_commission_amount - seller_net_amount;

  -- 1. Create platform fee transaction (negative for seller)
  IF platform_fee_amount > 0 THEN
    INSERT INTO balance_transactions (
      user_id,
      email,
      type,
      amount,
      currency,
      description,
      order_id
    ) VALUES (
      NEW.user_id,
      seller_email,
      'platform_fee',
      -platform_fee_amount,
      NEW.currency,
      'Taxa da plataforma - Pedido ' || NEW.order_id,
      NEW.id::text
    );
  END IF;

  -- 2. Create sale revenue transaction for seller
  IF seller_net_amount > 0 THEN
    INSERT INTO balance_transactions (
      user_id,
      email,
      type,
      amount,
      currency,
      description,
      order_id
    ) VALUES (
      NEW.user_id,
      seller_email,
      'sale_revenue',
      seller_net_amount,
      NEW.currency,
      'Venda - Pedido ' || NEW.order_id,
      NEW.id::text
    );
  END IF;

  -- 3. If there's an affiliate, create affiliate commission transaction
  IF NEW.affiliate_code IS NOT NULL AND affiliate_commission_amount > 0 THEN
    -- Find the affiliate (check both 'ativo' and 'approved' status)
    SELECT * INTO affiliate_record
    FROM affiliates
    WHERE affiliate_code = NEW.affiliate_code
      AND product_id = NEW.product_id
      AND status IN ('ativo', 'approved')
    LIMIT 1;

    IF affiliate_record IS NOT NULL THEN
      INSERT INTO balance_transactions (
        user_id,
        email,
        type,
        amount,
        currency,
        description,
        order_id
      ) VALUES (
        affiliate_record.affiliate_user_id,
        affiliate_record.affiliate_email,
        'affiliate_commission',
        affiliate_commission_amount,
        NEW.currency,
        'Comissão de afiliado - Pedido ' || NEW.order_id,
        NEW.id::text
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;