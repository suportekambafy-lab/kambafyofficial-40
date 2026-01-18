-- =============================================
-- ATUALIZAR SISTEMA DE CO-PRODUÇÃO
-- Adicionar validade de contrato e regras de cancelamento
-- =============================================

-- Adicionar novas colunas à tabela coproducers
ALTER TABLE public.coproducers
ADD COLUMN IF NOT EXISTS duration_days INTEGER NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS canceled_by TEXT CHECK (canceled_by IN ('owner', 'coproducer'));

-- Atualizar registros existentes para ter expires_at baseado na data de aceitação
UPDATE public.coproducers 
SET expires_at = accepted_at + (duration_days || ' days')::INTERVAL
WHERE status = 'accepted' AND expires_at IS NULL AND accepted_at IS NOT NULL;

-- Criar função para verificar se co-produção está ativa (não expirada e não cancelada)
CREATE OR REPLACE FUNCTION public.is_coproduction_active(
  p_coproducer_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_coproducer RECORD;
BEGIN
  SELECT * INTO v_coproducer
  FROM public.coproducers
  WHERE id = p_coproducer_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Deve estar aceito
  IF v_coproducer.status != 'accepted' THEN
    RETURN FALSE;
  END IF;
  
  -- Não pode estar cancelado
  IF v_coproducer.canceled_at IS NOT NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Não pode estar expirado
  IF v_coproducer.expires_at IS NOT NULL AND v_coproducer.expires_at < NOW() THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Atualizar a função de processamento de comissões para verificar expiração
CREATE OR REPLACE FUNCTION public.process_coproducer_commissions(
  p_order_id UUID,
  p_product_id UUID,
  p_seller_amount NUMERIC,
  p_currency TEXT,
  p_product_name TEXT
) RETURNS NUMERIC AS $$
DECLARE
  v_coproducer RECORD;
  v_coproducer_amount NUMERIC;
  v_remaining_amount NUMERIC := p_seller_amount;
BEGIN
  -- Buscar todos os co-produtores aceitos, não cancelados e não expirados
  FOR v_coproducer IN (
    SELECT 
      c.id,
      c.coproducer_user_id,
      c.coproducer_email,
      c.coproducer_name,
      c.commission_rate,
      c.expires_at,
      c.canceled_at
    FROM public.coproducers c
    WHERE c.product_id = p_product_id
      AND c.status = 'accepted'
      AND c.coproducer_user_id IS NOT NULL
      AND c.canceled_at IS NULL
      AND (c.expires_at IS NULL OR c.expires_at > NOW())
  ) LOOP
    -- Calcular valor do co-produtor
    v_coproducer_amount := ROUND(p_seller_amount * (v_coproducer.commission_rate / 100), 2);
    
    -- Criar transação de balanço para o co-produtor
    INSERT INTO public.balance_transactions (
      user_id,
      type,
      amount,
      currency,
      description,
      order_id,
      email
    ) VALUES (
      v_coproducer.coproducer_user_id,
      'coproduction_revenue',
      v_coproducer_amount,
      p_currency,
      'Co-produção: ' || p_product_name,
      p_order_id,
      v_coproducer.coproducer_email
    );
    
    -- Subtrair do valor restante do vendedor
    v_remaining_amount := v_remaining_amount - v_coproducer_amount;
    
    RAISE LOG '[Coproduction] Co-produtor % recebe % % (% pct)', 
      v_coproducer.coproducer_email, v_coproducer_amount, p_currency, v_coproducer.commission_rate;
  END LOOP;
  
  RETURN v_remaining_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar índice para queries de expiração
CREATE INDEX IF NOT EXISTS idx_coproducers_expires_at ON public.coproducers(expires_at);
CREATE INDEX IF NOT EXISTS idx_coproducers_canceled_at ON public.coproducers(canceled_at);