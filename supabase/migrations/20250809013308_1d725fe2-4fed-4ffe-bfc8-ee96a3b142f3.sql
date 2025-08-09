-- Adicionar coluna email para suportar KambaPay por email
ALTER TABLE public.customer_balances 
ADD COLUMN email TEXT;

-- Criar índice para busca por email
CREATE INDEX idx_customer_balances_email ON public.customer_balances(email);

-- Atualizar política RLS para permitir acesso por email também
DROP POLICY IF EXISTS "Users can view their own balance" ON public.customer_balances;
DROP POLICY IF EXISTS "Users can create their own balance" ON public.customer_balances;
DROP POLICY IF EXISTS "Users can update their own balance" ON public.customer_balances;

-- Nova política para visualizar saldo (por user_id ou email)
CREATE POLICY "Users can view their own balance" ON public.customer_balances
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  (email IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Nova política para criar saldo (por user_id ou permitir criação por email)
CREATE POLICY "Users can create their own balance" ON public.customer_balances
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR 
  (email IS NOT NULL AND user_id IS NULL)
);

-- Nova política para atualizar saldo (por user_id ou email)
CREATE POLICY "Users can update their own balance" ON public.customer_balances
FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  (email IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Criar política para permitir acesso público ao saldo por email (para checkout)
CREATE POLICY "Public can access balance by email" ON public.customer_balances
FOR SELECT 
USING (email IS NOT NULL);

-- Criar tabela para registros KambaPay por email
CREATE TABLE public.kambapay_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kambapay_registrations ENABLE ROW LEVEL SECURITY;

-- Política para permitir criação de registro KambaPay
CREATE POLICY "Anyone can register for KambaPay" ON public.kambapay_registrations
FOR INSERT 
WITH CHECK (true);

-- Política para visualizar próprio registro
CREATE POLICY "Users can view their own registration" ON public.kambapay_registrations
FOR SELECT 
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
  email IS NOT NULL
);

-- Atualizar políticas de balance_transactions para suportar email
ALTER TABLE public.balance_transactions 
ADD COLUMN email TEXT;

-- Políticas para transações por email
CREATE POLICY "Users can view transactions by email" ON public.balance_transactions
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  (email IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

CREATE POLICY "System can insert transactions by email" ON public.balance_transactions
FOR INSERT 
WITH CHECK (true);