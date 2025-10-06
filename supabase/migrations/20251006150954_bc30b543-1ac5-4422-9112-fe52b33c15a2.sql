-- ✅ Recriar o trigger para sincronizar saldo corretamente
DROP FUNCTION IF EXISTS public.sync_customer_balance() CASCADE;

CREATE OR REPLACE FUNCTION public.sync_customer_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  current_balance NUMERIC;
BEGIN
  -- Se a transação tem user_id, atualizar customer_balances
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
  
  -- Se a transação tem email (sem user_id), atualizar customer_balances por email
  IF NEW.email IS NOT NULL AND NEW.user_id IS NULL THEN
    SELECT balance INTO current_balance
    FROM public.customer_balances
    WHERE email = NEW.email;
    
    IF current_balance IS NULL THEN
      INSERT INTO public.customer_balances (email, balance, currency, user_id)
      VALUES (NEW.email, NEW.amount, NEW.currency, NULL);
    ELSE
      UPDATE public.customer_balances
      SET 
        balance = balance + NEW.amount,
        updated_at = now()
      WHERE email = NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recriar o trigger
DROP TRIGGER IF EXISTS sync_balance_on_transaction ON public.balance_transactions;
CREATE TRIGGER sync_balance_on_transaction
  AFTER INSERT ON public.balance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_customer_balance();