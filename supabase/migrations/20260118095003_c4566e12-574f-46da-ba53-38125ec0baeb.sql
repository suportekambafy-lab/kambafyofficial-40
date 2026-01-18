-- =============================================
-- SISTEMA DE CO-PRODUÇÃO
-- =============================================

-- Tabela para armazenar co-produtores de produtos
CREATE TABLE public.coproducers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL, -- Dono do produto (referência ao auth.users)
  coproducer_user_id UUID, -- Co-produtor (NULL até aceitar, se já tiver conta)
  coproducer_email TEXT NOT NULL,
  coproducer_name TEXT,
  commission_rate NUMERIC NOT NULL CHECK (commission_rate > 0 AND commission_rate < 100),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'removed')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, coproducer_email)
);

-- Índices para performance
CREATE INDEX idx_coproducers_product_id ON public.coproducers(product_id);
CREATE INDEX idx_coproducers_owner_user_id ON public.coproducers(owner_user_id);
CREATE INDEX idx_coproducers_coproducer_user_id ON public.coproducers(coproducer_user_id);
CREATE INDEX idx_coproducers_coproducer_email ON public.coproducers(coproducer_email);
CREATE INDEX idx_coproducers_status ON public.coproducers(status);

-- Enable RLS
ALTER TABLE public.coproducers ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Donos de produtos podem ver todos os co-produtores dos seus produtos
CREATE POLICY "Product owners can view their coproducers"
ON public.coproducers FOR SELECT
USING (owner_user_id = auth.uid());

-- Donos podem criar co-produtores para seus produtos
CREATE POLICY "Product owners can create coproducers"
ON public.coproducers FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

-- Donos podem atualizar co-produtores dos seus produtos
CREATE POLICY "Product owners can update their coproducers"
ON public.coproducers FOR UPDATE
USING (owner_user_id = auth.uid());

-- Donos podem remover co-produtores dos seus produtos
CREATE POLICY "Product owners can delete their coproducers"
ON public.coproducers FOR DELETE
USING (owner_user_id = auth.uid());

-- Co-produtores podem ver convites para seu email
CREATE POLICY "Coproducers can view their invites"
ON public.coproducers FOR SELECT
USING (
  coproducer_user_id = auth.uid() OR
  coproducer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Co-produtores podem atualizar (aceitar/rejeitar) seus próprios convites
CREATE POLICY "Coproducers can respond to their invites"
ON public.coproducers FOR UPDATE
USING (
  coproducer_user_id = auth.uid() OR
  coproducer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_coproducers_updated_at
BEFORE UPDATE ON public.coproducers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ATUALIZAR TRIGGER DE BALANCE TRANSACTIONS
-- Para dividir lucros com co-produtores
-- =============================================

-- Primeiro, vamos criar uma função auxiliar para processar co-produtores
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
  -- Buscar todos os co-produtores aceitos deste produto
  FOR v_coproducer IN (
    SELECT 
      c.id,
      c.coproducer_user_id,
      c.coproducer_email,
      c.coproducer_name,
      c.commission_rate
    FROM public.coproducers c
    WHERE c.product_id = p_product_id
      AND c.status = 'accepted'
      AND c.coproducer_user_id IS NOT NULL
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