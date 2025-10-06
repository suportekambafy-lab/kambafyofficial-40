-- Criar função que atualiza customer_balances quando há nova transação
CREATE OR REPLACE FUNCTION public.sync_customer_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a transação tem user_id, atualizar customer_balances
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.customer_balances (user_id, balance, currency)
    VALUES (NEW.user_id, NEW.amount, NEW.currency)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      balance = customer_balances.balance + NEW.amount,
      updated_at = now();
  END IF;
  
  -- Se a transação tem email (sem user_id), atualizar customer_balances por email
  IF NEW.email IS NOT NULL AND NEW.user_id IS NULL THEN
    INSERT INTO public.customer_balances (email, balance, currency, user_id)
    VALUES (NEW.email, NEW.amount, NEW.currency, NULL)
    ON CONFLICT (email) 
    DO UPDATE SET 
      balance = customer_balances.balance + NEW.amount,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger que executa a função após INSERT em balance_transactions
DROP TRIGGER IF EXISTS sync_balance_on_transaction ON public.balance_transactions;
CREATE TRIGGER sync_balance_on_transaction
  AFTER INSERT ON public.balance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_customer_balance();

-- Recalcular todos os saldos existentes baseado nas transações
-- Primeiro, zerar todos os saldos
UPDATE public.customer_balances SET balance = 0;

-- Recalcular saldos por user_id
WITH user_balances AS (
  SELECT 
    user_id,
    SUM(amount) as total_balance
  FROM public.balance_transactions
  WHERE user_id IS NOT NULL
  GROUP BY user_id
)
UPDATE public.customer_balances cb
SET 
  balance = ub.total_balance,
  updated_at = now()
FROM user_balances ub
WHERE cb.user_id = ub.user_id;

-- Recalcular saldos por email (quando não tem user_id)
WITH email_balances AS (
  SELECT 
    email,
    SUM(amount) as total_balance
  FROM public.balance_transactions
  WHERE email IS NOT NULL AND user_id IS NULL
  GROUP BY email
)
UPDATE public.customer_balances cb
SET 
  balance = eb.total_balance,
  updated_at = now()
FROM email_balances eb
WHERE cb.email = eb.email AND cb.user_id IS NULL;