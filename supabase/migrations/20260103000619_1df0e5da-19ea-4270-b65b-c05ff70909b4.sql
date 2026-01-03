-- Função que calcula o ganho real do vendedor (igual ao Dashboard)
-- 8.99% comissão para KZ, 9.99% para outras moedas
CREATE OR REPLACE FUNCTION public.calculate_seller_earning(
  p_amount NUMERIC,
  p_currency TEXT
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  commission_rate NUMERIC;
BEGIN
  -- Taxa de comissão baseada na moeda
  IF p_currency = 'KZ' THEN
    commission_rate := 0.0899;
  ELSE
    commission_rate := 0.0999;
  END IF;
  
  -- Retorna o valor líquido (valor bruto - comissão)
  RETURN ROUND(p_amount * (1 - commission_rate), 2);
END;
$$;

-- Trigger function que credita o vendedor quando pedido é completado
-- Usa a mesma lógica de cálculo do Dashboard
CREATE OR REPLACE FUNCTION public.credit_seller_on_order_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_seller_id UUID;
  v_amount NUMERIC;
  v_currency TEXT;
  v_seller_earning NUMERIC;
  v_product_name TEXT;
  v_existing_transaction UUID;
BEGIN
  -- Só processar quando status muda para 'completed'
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;
  
  -- Se já estava completed, não processar novamente
  IF OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;
  
  -- Verificar se já existe transação para esta venda (evitar duplicados)
  SELECT id INTO v_existing_transaction
  FROM balance_transactions
  WHERE order_id = NEW.order_id
    AND type = 'sale_revenue'
  LIMIT 1;
  
  IF v_existing_transaction IS NOT NULL THEN
    RAISE NOTICE 'Transação já existe para order_id: %', NEW.order_id;
    RETURN NEW;
  END IF;
  
  -- Buscar informações do produto e vendedor
  SELECT p.user_id, p.name INTO v_seller_id, v_product_name
  FROM products p
  WHERE p.id = NEW.product_id;
  
  IF v_seller_id IS NULL THEN
    RAISE WARNING 'Produto não encontrado para order_id: %', NEW.order_id;
    RETURN NEW;
  END IF;
  
  -- Determinar o valor e moeda correctos
  v_amount := COALESCE(NEW.original_amount::NUMERIC, NEW.amount::NUMERIC);
  v_currency := COALESCE(NEW.original_currency, NEW.currency, 'KZ');
  
  -- Calcular ganho do vendedor usando a função centralizada
  v_seller_earning := calculate_seller_earning(v_amount, v_currency);
  
  -- Garantir que existe registro de saldo para esta moeda
  INSERT INTO currency_balances (user_id, currency, balance, retained_balance)
  VALUES (v_seller_id, v_currency, 0, 0)
  ON CONFLICT (user_id, currency) DO NOTHING;
  
  -- Actualizar saldo
  UPDATE currency_balances
  SET balance = balance + v_seller_earning,
      updated_at = NOW()
  WHERE user_id = v_seller_id 
    AND currency = v_currency;
  
  -- Registar transação
  INSERT INTO balance_transactions (
    user_id,
    amount,
    currency,
    type,
    description,
    order_id
  ) VALUES (
    v_seller_id,
    v_seller_earning,
    v_currency,
    'sale_revenue',
    'Venda: ' || COALESCE(v_product_name, 'Produto') || ' - ' || NEW.customer_name,
    NEW.order_id
  );
  
  RAISE NOTICE 'Vendedor % creditado com % % (ordem: %)', 
    v_seller_id, v_seller_earning, v_currency, NEW.order_id;
  
  RETURN NEW;
END;
$$;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS order_complete_sale_revenue_trigger ON orders;

-- Criar novo trigger
CREATE TRIGGER order_complete_sale_revenue_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION credit_seller_on_order_complete();