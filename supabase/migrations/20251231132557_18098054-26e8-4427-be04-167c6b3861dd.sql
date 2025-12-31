-- Create currency_balances table for multi-currency support (like Hotmart)
CREATE TABLE public.currency_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'KZ',
  balance numeric NOT NULL DEFAULT 0,
  retained_balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, currency)
);

-- Enable RLS
ALTER TABLE public.currency_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own currency balances"
ON public.currency_balances FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage currency balances"
ON public.currency_balances FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can view all currency balances"
ON public.currency_balances FOR SELECT
USING (is_admin());

-- Create index for faster lookups
CREATE INDEX idx_currency_balances_user_currency ON public.currency_balances(user_id, currency);

-- Add currency column to withdrawal_requests if not exists
ALTER TABLE public.withdrawal_requests 
ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'KZ';

-- Add index for withdrawal requests by currency
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_currency ON public.withdrawal_requests(user_id, currency);

-- Function to get or create currency balance
CREATE OR REPLACE FUNCTION get_or_create_currency_balance(p_user_id uuid, p_currency text)
RETURNS numeric AS $$
DECLARE
  v_balance numeric;
BEGIN
  SELECT balance INTO v_balance
  FROM currency_balances
  WHERE user_id = p_user_id AND currency = p_currency;
  
  IF NOT FOUND THEN
    INSERT INTO currency_balances (user_id, currency, balance)
    VALUES (p_user_id, p_currency, 0)
    ON CONFLICT (user_id, currency) DO NOTHING
    RETURNING balance INTO v_balance;
    
    IF v_balance IS NULL THEN
      SELECT balance INTO v_balance
      FROM currency_balances
      WHERE user_id = p_user_id AND currency = p_currency;
    END IF;
  END IF;
  
  RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to credit currency balance (for sale revenue)
CREATE OR REPLACE FUNCTION credit_currency_balance(
  p_user_id uuid, 
  p_currency text, 
  p_amount numeric,
  p_description text,
  p_order_id text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Ensure balance record exists
  INSERT INTO currency_balances (user_id, currency, balance)
  VALUES (p_user_id, p_currency, 0)
  ON CONFLICT (user_id, currency) DO NOTHING;
  
  -- Update balance
  UPDATE currency_balances
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id AND currency = p_currency;
  
  -- Record transaction
  INSERT INTO balance_transactions (user_id, amount, currency, type, description, order_id)
  VALUES (p_user_id, p_amount, p_currency, 'sale_revenue', p_description, p_order_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to debit currency balance (for withdrawals)
CREATE OR REPLACE FUNCTION debit_currency_balance(
  p_user_id uuid, 
  p_currency text, 
  p_amount numeric,
  p_description text
)
RETURNS boolean AS $$
DECLARE
  v_current_balance numeric;
BEGIN
  SELECT balance INTO v_current_balance
  FROM currency_balances
  WHERE user_id = p_user_id AND currency = p_currency
  FOR UPDATE;
  
  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN false;
  END IF;
  
  UPDATE currency_balances
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id AND currency = p_currency;
  
  INSERT INTO balance_transactions (user_id, amount, currency, type, description)
  VALUES (p_user_id, -p_amount, p_currency, 'withdrawal', p_description);
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to recalculate all currency balances for a user
CREATE OR REPLACE FUNCTION recalculate_user_currency_balances(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_currency text;
  v_total numeric;
BEGIN
  -- Get all unique currencies from transactions
  FOR v_currency IN 
    SELECT DISTINCT currency 
    FROM balance_transactions 
    WHERE user_id = p_user_id
  LOOP
    -- Calculate total for this currency
    SELECT COALESCE(SUM(amount), 0) INTO v_total
    FROM balance_transactions
    WHERE user_id = p_user_id AND currency = v_currency;
    
    -- Upsert currency balance
    INSERT INTO currency_balances (user_id, currency, balance, updated_at)
    VALUES (p_user_id, v_currency, v_total, now())
    ON CONFLICT (user_id, currency) 
    DO UPDATE SET balance = v_total, updated_at = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update currency_balances when balance_transactions change
CREATE OR REPLACE FUNCTION update_currency_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure currency balance record exists
  INSERT INTO currency_balances (user_id, currency, balance)
  VALUES (NEW.user_id, NEW.currency, 0)
  ON CONFLICT (user_id, currency) DO NOTHING;
  
  -- Update the balance
  UPDATE currency_balances
  SET balance = balance + NEW.amount,
      updated_at = now()
  WHERE user_id = NEW.user_id AND currency = NEW.currency;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS trigger_update_currency_balance ON balance_transactions;
CREATE TRIGGER trigger_update_currency_balance
AFTER INSERT ON balance_transactions
FOR EACH ROW
EXECUTE FUNCTION update_currency_balance_on_transaction();

-- Migrate existing KZ balances to currency_balances table
INSERT INTO currency_balances (user_id, currency, balance, created_at, updated_at)
SELECT user_id, 'KZ', balance, created_at, updated_at
FROM customer_balances
WHERE user_id IS NOT NULL AND balance != 0
ON CONFLICT (user_id, currency) DO UPDATE SET 
  balance = EXCLUDED.balance,
  updated_at = now();

-- Grant permissions
GRANT SELECT ON currency_balances TO authenticated;
GRANT ALL ON currency_balances TO service_role;