-- ========================================
-- CORREÇÃO COMPLETA DO SISTEMA FINANCEIRO
-- ========================================

-- ========================================
-- FASE 0: REMOVER CONSTRAINT TEMPORARIAMENTE
-- ========================================

DROP INDEX IF EXISTS public.idx_balance_transactions_unique_order;

-- ========================================
-- FASE 1: BACKUP E LIMPEZA TOTAL
-- ========================================

-- Criar tabela temporária para salvar transações de saques
CREATE TEMP TABLE IF NOT EXISTS temp_withdrawal_transactions AS
SELECT * FROM public.balance_transactions
WHERE type IN ('withdrawal', 'kambafy_fee')
  OR (order_id IS NULL AND type NOT IN ('credit', 'sale_revenue', 'debit'));

-- Limpar completamente balance_transactions
TRUNCATE TABLE public.balance_transactions;

-- Restaurar transações de saques
INSERT INTO public.balance_transactions
SELECT * FROM temp_withdrawal_transactions;

-- ========================================
-- FASE 2: RECRIAR TRANSAÇÕES DE VENDAS
-- ========================================

-- Recriar todas as transações de vendas completed (sem duplicatas)
INSERT INTO public.balance_transactions (
  user_id,
  type,
  amount,
  currency,
  description,
  order_id,
  created_at
)
SELECT DISTINCT ON (p.user_id, o.order_id)
  p.user_id,
  'credit' as type,
  CASE 
    WHEN o.currency = 'EUR' THEN (o.amount::numeric * 1000)
    ELSE o.amount::numeric
  END as amount,
  'KZ' as currency,
  'Venda de ' || p.name as description,
  o.order_id,
  o.created_at
FROM public.orders o
INNER JOIN public.products p ON o.product_id = p.id
WHERE o.status = 'completed'
  AND o.user_id IS NOT NULL
  AND p.user_id IS NOT NULL
ORDER BY p.user_id, o.order_id, o.created_at DESC;

-- ========================================
-- FASE 3: RECALCULAR CUSTOMER_BALANCES
-- ========================================

-- Limpar saldos existentes
TRUNCATE TABLE public.customer_balances;

-- Recriar saldos corretos por usuário
INSERT INTO public.customer_balances (user_id, balance, currency)
SELECT 
  user_id,
  SUM(amount) as balance,
  'KZ' as currency
FROM public.balance_transactions
WHERE user_id IS NOT NULL
GROUP BY user_id;

-- ========================================
-- FASE 4: RECRIAR CONSTRAINT
-- ========================================

-- Recriar constraint para prevenir duplicatas futuras
CREATE UNIQUE INDEX idx_balance_transactions_unique_order
ON public.balance_transactions (user_id, order_id, type, amount)
WHERE order_id IS NOT NULL;

-- ========================================
-- FASE 5: CRIAR TRIGGER AUTOMÁTICO
-- ========================================

-- Criar função para gerar balance_transaction quando venda for completed
CREATE OR REPLACE FUNCTION public.create_balance_transaction_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_record RECORD;
  transaction_amount NUMERIC;
  transaction_exists BOOLEAN;
BEGIN
  -- Só processar quando status mudar para completed
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'completed')) THEN
    
    -- Buscar informações do produto
    SELECT user_id, name INTO product_record
    FROM public.products
    WHERE id = NEW.product_id;
    
    -- Se não encontrar produto ou não tiver user_id, não fazer nada
    IF product_record.user_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Verificar se já existe transação para este order_id
    SELECT EXISTS (
      SELECT 1 FROM public.balance_transactions
      WHERE order_id = NEW.order_id 
        AND type = 'credit'
        AND user_id = product_record.user_id
    ) INTO transaction_exists;
    
    -- Se já existe, não criar duplicata
    IF transaction_exists THEN
      RETURN NEW;
    END IF;
    
    -- Converter moeda se necessário (EUR -> KZ)
    IF NEW.currency = 'EUR' THEN
      transaction_amount := NEW.amount::numeric * 1000;
    ELSE
      transaction_amount := NEW.amount::numeric;
    END IF;
    
    -- Criar transação de crédito
    INSERT INTO public.balance_transactions (
      user_id,
      type,
      amount,
      currency,
      description,
      order_id,
      created_at
    )
    VALUES (
      product_record.user_id,
      'credit',
      transaction_amount,
      'KZ',
      'Venda de ' || product_record.name,
      NEW.order_id,
      NEW.created_at
    );
    
    -- Atualizar customer_balances
    UPDATE public.customer_balances
    SET 
      balance = balance + transaction_amount,
      updated_at = NOW()
    WHERE user_id = product_record.user_id;
    
    -- Se não existe registro em customer_balances, criar
    IF NOT FOUND THEN
      INSERT INTO public.customer_balances (user_id, balance, currency)
      VALUES (product_record.user_id, transaction_amount, 'KZ');
    END IF;
      
  END IF;
  
  RETURN NEW;
END;
$$;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS create_balance_on_completed_sale ON public.orders;

-- Criar novo trigger na tabela orders
CREATE TRIGGER create_balance_on_completed_sale
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_balance_transaction_on_sale();

-- ========================================
-- FASE 6: VALIDAÇÃO COMPLETA
-- ========================================

DO $$
DECLARE
  total_credits NUMERIC;
  total_orders NUMERIC;
  total_balance NUMERIC;
  total_withdrawals NUMERIC;
  credit_count INTEGER;
  orders_count INTEGER;
  withdrawal_count INTEGER;
BEGIN
  -- Total de créditos de vendas
  SELECT 
    COALESCE(SUM(amount), 0), 
    COUNT(*) 
  INTO total_credits, credit_count
  FROM public.balance_transactions
  WHERE type = 'credit' AND order_id IS NOT NULL;
  
  -- Total de vendas completed
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN o.currency = 'EUR' THEN o.amount::numeric * 1000
        ELSE o.amount::numeric
      END
    ), 0), 
    COUNT(*) 
  INTO total_orders, orders_count
  FROM public.orders o
  INNER JOIN public.products p ON o.product_id = p.id
  WHERE o.status = 'completed' 
    AND o.user_id IS NOT NULL
    AND p.user_id IS NOT NULL;
  
  -- Total de saques
  SELECT 
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO total_withdrawals, withdrawal_count
  FROM public.balance_transactions
  WHERE type IN ('withdrawal', 'kambafy_fee');
  
  -- Saldo em customer_balances
  SELECT COALESCE(SUM(balance), 0) INTO total_balance
  FROM public.customer_balances;
  
  RAISE NOTICE '╔════════════════════════════════════════╗';
  RAISE NOTICE '║   SISTEMA FINANCEIRO CORRIGIDO         ║';
  RAISE NOTICE '╚════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📊 VENDAS COMPLETED:';
  RAISE NOTICE '   └─ % orders no sistema', orders_count;
  RAISE NOTICE '   └─ Total: % KZ', total_orders;
  RAISE NOTICE '';
  RAISE NOTICE '💰 TRANSAÇÕES DE CRÉDITO CRIADAS:';
  RAISE NOTICE '   └─ % transações geradas', credit_count;
  RAISE NOTICE '   └─ Total: % KZ', total_credits;
  RAISE NOTICE '';
  RAISE NOTICE '💸 SAQUES PRESERVADOS:';
  RAISE NOTICE '   └─ % transações mantidas', withdrawal_count;
  RAISE NOTICE '   └─ Total: % KZ', total_withdrawals;
  RAISE NOTICE '';
  RAISE NOTICE '🏦 SALDO EM CONTA:';
  RAISE NOTICE '   └─ % KZ', total_balance;
  RAISE NOTICE '   └─ (Créditos - Saques)';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';
  
  IF total_credits = total_orders AND credit_count = orders_count THEN
    RAISE NOTICE '✅ PERFEITO! Sistema 100%% sincronizado!';
    RAISE NOTICE '✅ % vendas = % transações', orders_count, credit_count;
  ELSE
    RAISE NOTICE '⚠️  Informação: % vendas geraram % transações', orders_count, credit_count;
    IF credit_count < orders_count THEN
      RAISE NOTICE '    (Algumas vendas podem ter sido duplicadas)';
    END IF;
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '🎯 Trigger ativado para futuras vendas!';
  RAISE NOTICE '═══════════════════════════════════════';
END $$;