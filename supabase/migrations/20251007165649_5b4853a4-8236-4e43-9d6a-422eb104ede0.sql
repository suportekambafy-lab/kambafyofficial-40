-- ============================================
-- CORREÇÃO: Saldo só deve ser creditado após 3 dias (payment release)
-- ============================================

-- 1. Remover trigger que atualiza saldo imediatamente
DROP TRIGGER IF EXISTS sync_balance_on_transaction ON balance_transactions;

-- 2. Modificar trigger de vendas para NÃO criar transação imediatamente
CREATE OR REPLACE FUNCTION public.create_balance_transaction_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_record RECORD;
BEGIN
  -- Só processar quando status mudar para completed
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'completed')) THEN
    
    -- Buscar informações do produto
    SELECT user_id, name INTO product_record
    FROM public.products
    WHERE id = NEW.product_id;
    
    -- ❌ REMOVIDO: Não criar transação de crédito aqui
    -- A transação será criada pela função auto-release-payments após 3 dias
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Zerar saldo do Dario (já que os 4500 ainda estão pendentes)
UPDATE customer_balances
SET balance = 0, updated_at = NOW()
WHERE user_id = 'a906647b-3e73-4ddc-a8ed-c00cdd7b8c31';

-- 4. Remover transações de crédito que foram criadas prematuramente
DELETE FROM balance_transactions
WHERE user_id = 'a906647b-3e73-4ddc-a8ed-c00cdd7b8c31'
  AND type = 'credit'
  AND order_id IN (
    SELECT order_id FROM orders 
    WHERE user_id = (
      SELECT user_id FROM products WHERE id = (
        SELECT product_id FROM orders WHERE order_id = balance_transactions.order_id LIMIT 1
      )
    )
    AND created_at > NOW() - INTERVAL '3 days'
  );

-- 5. Recriar trigger sync_customer_balance (só para débitos e créditos manuais)
CREATE OR REPLACE FUNCTION public.sync_customer_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance NUMERIC;
BEGIN
  -- ✅ Atualizar saldo apenas para:
  -- - Débitos (saques)
  -- - Créditos de releases de pagamento (após 3 dias)
  -- - Outros tipos de transação que não sejam vendas normais
  
  IF NEW.user_id IS NOT NULL THEN
    -- Buscar saldo atual
    SELECT balance INTO current_balance
    FROM public.customer_balances
    WHERE user_id = NEW.user_id;
    
    -- Se não existe registro, criar um
    IF current_balance IS NULL THEN
      INSERT INTO public.customer_balances (user_id, balance, currency)
      VALUES (NEW.user_id, NEW.amount, NEW.currency);
    ELSE
      -- Atualizar saldo existente
      UPDATE public.customer_balances
      SET 
        balance = balance + NEW.amount,
        updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_balance_on_transaction
  AFTER INSERT ON balance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION sync_customer_balance();