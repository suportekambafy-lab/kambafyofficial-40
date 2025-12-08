-- ================================================
-- CORREÇÃO DE SEGURANÇA CRÍTICA: SALDO E TRANSAÇÕES
-- Remover políticas inseguras que permitem qualquer pessoa alterar saldos
-- ================================================

-- =============================================
-- 1. REMOVER POLÍTICAS PERIGOSAS DE customer_balances
-- =============================================
DROP POLICY IF EXISTS "System can update balance" ON public.customer_balances;

-- =============================================
-- 2. REMOVER POLÍTICAS PERIGOSAS DE balance_transactions
-- =============================================
DROP POLICY IF EXISTS "System can insert transactions" ON public.balance_transactions;
DROP POLICY IF EXISTS "System can insert transactions by email" ON public.balance_transactions;

-- =============================================
-- 3. CRIAR POLÍTICAS SEGURAS PARA customer_balances
-- Apenas o próprio usuário pode ver seu saldo
-- Apenas triggers e funções de sistema podem atualizar (via service_role)
-- =============================================

-- Política para UPDATE - APENAS service_role (backend) pode atualizar saldos
-- Usuários normais NÃO podem atualizar saldos diretamente
CREATE POLICY "Only service role can update balances"
ON public.customer_balances
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================
-- 4. CRIAR POLÍTICAS SEGURAS PARA balance_transactions
-- Apenas service_role pode inserir transações
-- =============================================

-- Remover política antiga que permite usuários criar transações
DROP POLICY IF EXISTS "Users can create their transactions" ON public.balance_transactions;

-- Apenas service_role (backend/edge functions) pode inserir transações
CREATE POLICY "Only service role can insert transactions"
ON public.balance_transactions
FOR INSERT
TO service_role
WITH CHECK (true);

-- Política para usuários autenticados verem suas transações (manter)
-- Já existe: "Users can view their own transactions"

-- =============================================
-- 5. GARANTIR QUE RLS ESTÁ ATIVO
-- =============================================
ALTER TABLE public.customer_balances FORCE ROW LEVEL SECURITY;
ALTER TABLE public.balance_transactions FORCE ROW LEVEL SECURITY;