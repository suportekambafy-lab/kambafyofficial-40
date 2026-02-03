-- ============================================================
-- ATUALIZAÇÃO: Taxa da plataforma sobre valor BRUTO primeiro
-- ============================================================
-- Nova lógica: 
-- 1. Calcular taxa da plataforma sobre o valor TOTAL
-- 2. Subtrair taxa para obter valor líquido
-- 3. Dividir valor líquido entre afiliado e vendedor

CREATE OR REPLACE FUNCTION public.create_balance_transaction_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller_profile RECORD;
  affiliate_record RECORD;
  platform_fee_rate NUMERIC := 0.0899;
  gross_amount NUMERIC;
  platform_fee_amount NUMERIC;
  net_after_platform NUMERIC;
  affiliate_rate NUMERIC;
  affiliate_commission_amount NUMERIC;
  seller_final_amount NUMERIC;
  existing_transaction_count INTEGER;
  affiliate_user_id UUID;
  order_currency TEXT;
BEGIN
  -- Só processar quando status muda para 'completed'
  IF NEW.status != 'completed' OR (OLD IS NOT NULL AND OLD.status = 'completed') THEN
    RETURN NEW;
  END IF;

  -- Verificar se já existem transações para esta ordem (evitar duplicatas)
  SELECT COUNT(*) INTO existing_transaction_count
  FROM balance_transactions
  WHERE order_id = NEW.id::text;

  IF existing_transaction_count > 0 THEN
    RAISE NOTICE 'Transações já existem para order %, ignorando...', NEW.id;
    RETURN NEW;
  END IF;

  -- Buscar perfil do vendedor
  SELECT * INTO seller_profile
  FROM profiles
  WHERE user_id = NEW.user_id;

  IF seller_profile IS NULL THEN
    RAISE NOTICE 'Perfil do vendedor não encontrado para user_id %', NEW.user_id;
    RETURN NEW;
  END IF;

  -- Determinar moeda e taxa da plataforma
  order_currency := COALESCE(NEW.currency, 'KZ');
  
  -- Taxa: 8.99% para Angola (KZ/AOA/AKZ), 9.99% para outros
  IF order_currency IN ('KZ', 'AOA', 'AKZ') THEN
    platform_fee_rate := 0.0899;
  ELSE
    platform_fee_rate := 0.0999;
  END IF;

  -- Converter amount para numeric
  gross_amount := NEW.amount::numeric;

  -- ============================================================
  -- NOVA LÓGICA: Taxa da plataforma sobre valor BRUTO primeiro
  -- ============================================================
  
  -- 1. Calcular taxa da plataforma sobre o valor TOTAL (bruto)
  platform_fee_amount := ROUND(gross_amount * platform_fee_rate, 2);
  
  -- 2. Valor líquido após taxa da plataforma
  net_after_platform := gross_amount - platform_fee_amount;

  -- 3. Verificar se há afiliado válido
  IF NEW.affiliate_code IS NOT NULL AND NEW.affiliate_code != '' THEN
    -- Buscar afiliado aprovado
    SELECT a.*, p.user_id as affiliate_user_id_from_profile
    INTO affiliate_record
    FROM affiliates a
    LEFT JOIN profiles p ON p.email = a.affiliate_email
    WHERE a.affiliate_code = NEW.affiliate_code
      AND a.product_id = NEW.product_id
      AND a.status = 'approved';

    IF affiliate_record IS NOT NULL THEN
      -- Calcular taxa do afiliado baseado no valor original passado
      -- Se tiver affiliate_commission salvo, usar para determinar a taxa
      IF NEW.affiliate_commission IS NOT NULL AND NEW.affiliate_commission > 0 THEN
        -- Recalcular: taxa original era sobre bruto, agora aplicar sobre líquido
        affiliate_rate := COALESCE(NEW.affiliate_commission::numeric / gross_amount, 0);
        affiliate_commission_amount := ROUND(net_after_platform * affiliate_rate, 2);
      ELSE
        -- Usar taxa do registro do afiliado
        affiliate_rate := COALESCE(
          NULLIF(REPLACE(affiliate_record.commission_rate, '%', ''), '')::numeric / 100,
          0
        );
        affiliate_commission_amount := ROUND(net_after_platform * affiliate_rate, 2);
      END IF;

      -- Vendedor recebe o restante do valor líquido
      seller_final_amount := net_after_platform - affiliate_commission_amount;

      -- Determinar user_id do afiliado
      affiliate_user_id := COALESCE(
        affiliate_record.affiliate_user_id::uuid,
        affiliate_record.affiliate_user_id_from_profile
      );

      RAISE NOTICE 'Venda com afiliado: bruto=%, taxa_plataforma=%, liquido=%, afiliado=%, vendedor=%',
        gross_amount, platform_fee_amount, net_after_platform, affiliate_commission_amount, seller_final_amount;
    ELSE
      -- Afiliado não encontrado/aprovado - vendedor recebe tudo (líquido)
      affiliate_commission_amount := 0;
      seller_final_amount := net_after_platform;
      affiliate_user_id := NULL;
    END IF;
  ELSE
    -- Sem afiliado - vendedor recebe valor líquido completo
    affiliate_commission_amount := 0;
    seller_final_amount := net_after_platform;
    affiliate_user_id := NULL;
  END IF;

  -- Usar seller_commission da order se disponível (já calculado pela edge function)
  IF NEW.seller_commission IS NOT NULL AND NEW.seller_commission > 0 THEN
    seller_final_amount := NEW.seller_commission::numeric;
  END IF;

  -- Criar transação de receita para o vendedor
  INSERT INTO balance_transactions (
    user_id,
    email,
    amount,
    currency,
    type,
    description,
    order_id
  ) VALUES (
    NEW.user_id,
    seller_profile.email,
    seller_final_amount,
    order_currency,
    'sale_revenue',
    'Venda: ' || COALESCE(NEW.customer_name, 'Cliente'),
    NEW.id::text
  );

  -- Criar transação de taxa da plataforma (registro)
  INSERT INTO balance_transactions (
    user_id,
    email,
    amount,
    currency,
    type,
    description,
    order_id
  ) VALUES (
    NEW.user_id,
    seller_profile.email,
    -platform_fee_amount,
    order_currency,
    'platform_fee',
    'Taxa da plataforma (' || (platform_fee_rate * 100)::text || '%)',
    NEW.id::text
  );

  -- Criar transação de comissão do afiliado (se aplicável)
  IF affiliate_user_id IS NOT NULL AND affiliate_commission_amount > 0 THEN
    INSERT INTO balance_transactions (
      user_id,
      email,
      amount,
      currency,
      type,
      description,
      order_id
    ) VALUES (
      affiliate_user_id,
      affiliate_record.affiliate_email,
      affiliate_commission_amount,
      order_currency,
      'affiliate_commission',
      'Comissão de afiliado: ' || COALESCE(NEW.customer_name, 'Cliente'),
      NEW.id::text
    );
  END IF;

  RETURN NEW;
END;
$$;