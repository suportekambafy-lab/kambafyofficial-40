-- Trigger para descontar automaticamente o valor do saque do saldo
CREATE OR REPLACE FUNCTION public.deduct_withdrawal_from_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Criar transação de débito quando saque é criado
  INSERT INTO public.balance_transactions (
    user_id,
    type,
    amount,
    currency,
    description,
    order_id
  )
  VALUES (
    NEW.user_id,
    'debit',
    -NEW.amount, -- Valor negativo para débito
    'KZ',
    'Saque solicitado',
    'withdrawal_' || NEW.id::text
  );
  
  -- Atualizar customer_balances
  UPDATE public.customer_balances
  SET 
    balance = balance - NEW.amount,
    updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar após inserção de withdrawal_request
DROP TRIGGER IF EXISTS on_withdrawal_request_created ON public.withdrawal_requests;
CREATE TRIGGER on_withdrawal_request_created
  AFTER INSERT ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_withdrawal_from_balance();

-- Função para estornar valor quando saque é rejeitado
CREATE OR REPLACE FUNCTION public.refund_rejected_withdrawal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Se o status mudou para 'rejeitado', estornar o valor
  IF NEW.status = 'rejeitado' AND OLD.status != 'rejeitado' THEN
    -- Criar transação de crédito (estorno)
    INSERT INTO public.balance_transactions (
      user_id,
      type,
      amount,
      currency,
      description,
      order_id
    )
    VALUES (
      NEW.user_id,
      'credit',
      NEW.amount, -- Valor positivo para crédito
      'KZ',
      'Estorno de saque rejeitado',
      'refund_withdrawal_' || NEW.id::text
    );
    
    -- Atualizar customer_balances
    UPDATE public.customer_balances
    SET 
      balance = balance + NEW.amount,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar após atualização de withdrawal_request
DROP TRIGGER IF EXISTS on_withdrawal_status_changed ON public.withdrawal_requests;
CREATE TRIGGER on_withdrawal_status_changed
  AFTER UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.refund_rejected_withdrawal();