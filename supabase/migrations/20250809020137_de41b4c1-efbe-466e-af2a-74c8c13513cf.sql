-- Alterar a coluna user_id para permitir NULL na tabela customer_balances
ALTER TABLE public.customer_balances 
ALTER COLUMN user_id DROP NOT NULL;

-- Também alterar na tabela balance_transactions para consistência
ALTER TABLE public.balance_transactions 
ALTER COLUMN user_id DROP NOT NULL;