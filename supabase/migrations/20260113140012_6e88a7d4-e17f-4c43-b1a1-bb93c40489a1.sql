-- 1. Adicionar código de indicação nos perfis
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- 2. Criar tabela de indicações de vendedores
CREATE TABLE public.seller_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL,
  referral_code TEXT NOT NULL,
  reward_option TEXT CHECK (reward_option IN ('long_term', 'short_term')),
  commission_rate NUMERIC(5,4),
  duration_months INTEGER,
  first_sale_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  fraud_check JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id),
  UNIQUE(referred_id)
);

-- 3. Criar tabela de comissões de indicação
CREATE TABLE public.referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID REFERENCES public.seller_referrals(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  sale_net_amount NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'KZ',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referral_id, order_id)
);

-- 4. Habilitar RLS
ALTER TABLE public.seller_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para seller_referrals
-- Indicadores podem ver suas indicações
CREATE POLICY "Referrers can view their referrals" 
ON public.seller_referrals 
FOR SELECT 
USING (auth.uid() = referrer_id);

-- Indicados podem ver quem os indicou
CREATE POLICY "Referred users can view their referral" 
ON public.seller_referrals 
FOR SELECT 
USING (auth.uid() = referred_id);

-- Indicadores podem atualizar reward_option de suas indicações pendentes
CREATE POLICY "Referrers can update pending referrals" 
ON public.seller_referrals 
FOR UPDATE 
USING (auth.uid() = referrer_id AND status = 'pending')
WITH CHECK (auth.uid() = referrer_id);

-- 6. Políticas RLS para referral_commissions
-- Indicadores podem ver suas comissões
CREATE POLICY "Referrers can view their commissions" 
ON public.referral_commissions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.seller_referrals sr 
    WHERE sr.id = referral_id AND sr.referrer_id = auth.uid()
  )
);

-- 7. Índices para performance
CREATE INDEX idx_seller_referrals_referrer ON public.seller_referrals(referrer_id);
CREATE INDEX idx_seller_referrals_referred ON public.seller_referrals(referred_id);
CREATE INDEX idx_seller_referrals_status ON public.seller_referrals(status);
CREATE INDEX idx_seller_referrals_expires ON public.seller_referrals(expires_at) WHERE status = 'active';
CREATE INDEX idx_referral_commissions_referral ON public.referral_commissions(referral_id);
CREATE INDEX idx_referral_commissions_order ON public.referral_commissions(order_id);
CREATE INDEX idx_profiles_referral_code ON public.profiles(referral_code) WHERE referral_code IS NOT NULL;

-- 8. Função para gerar código de indicação único
CREATE OR REPLACE FUNCTION public.generate_referral_code(user_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base_code TEXT;
  final_code TEXT;
  counter INTEGER := 0;
BEGIN
  -- Limpar e pegar primeiras 6 letras do nome
  base_code := UPPER(REGEXP_REPLACE(SPLIT_PART(user_name, ' ', 1), '[^A-Za-z]', '', 'g'));
  base_code := SUBSTRING(base_code FROM 1 FOR 6);
  
  -- Se muito curto, completar
  IF LENGTH(base_code) < 3 THEN
    base_code := 'USER';
  END IF;
  
  -- Gerar código único
  LOOP
    final_code := base_code || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
    final_code := UPPER(final_code);
    
    -- Verificar se já existe
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = final_code) THEN
      RETURN final_code;
    END IF;
    
    counter := counter + 1;
    IF counter > 100 THEN
      -- Fallback para UUID parcial
      RETURN UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 10));
    END IF;
  END LOOP;
END;
$$;

-- 9. Função para processar comissão de indicação quando ordem é completada
CREATE OR REPLACE FUNCTION public.process_referral_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_seller_id UUID;
  v_net_amount NUMERIC;
  v_commission NUMERIC;
  v_currency TEXT;
BEGIN
  -- Só processar quando status muda para 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Buscar o vendedor do produto
    SELECT user_id INTO v_seller_id 
    FROM public.products 
    WHERE id = NEW.product_id;
    
    IF v_seller_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Verificar se o vendedor foi indicado
    SELECT * INTO v_referral
    FROM public.seller_referrals
    WHERE referred_id = v_seller_id
      AND status IN ('pending', 'active')
      AND reward_option IS NOT NULL;
    
    IF v_referral IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Se é a primeira venda, ativar a indicação
    IF v_referral.first_sale_at IS NULL THEN
      UPDATE public.seller_referrals
      SET 
        first_sale_at = NOW(),
        expires_at = NOW() + (v_referral.duration_months || ' months')::INTERVAL,
        status = 'active',
        updated_at = NOW()
      WHERE id = v_referral.id;
      
      -- Recarregar dados atualizados
      SELECT * INTO v_referral
      FROM public.seller_referrals
      WHERE id = v_referral.id;
    END IF;
    
    -- Verificar se ainda está no período válido
    IF v_referral.status = 'active' AND (v_referral.expires_at IS NULL OR NOW() < v_referral.expires_at) THEN
      
      -- Calcular valor líquido (após taxa Kambafy)
      v_currency := COALESCE(NEW.original_currency, NEW.currency, 'KZ');
      v_net_amount := COALESCE(NEW.original_amount::NUMERIC, NEW.amount::NUMERIC, 0);
      
      -- Aplicar taxa Kambafy para obter valor líquido do vendedor
      IF v_currency = 'KZ' THEN
        v_net_amount := v_net_amount * 0.9101; -- 100% - 8.99%
      ELSE
        v_net_amount := v_net_amount * 0.9001; -- 100% - 9.99%
      END IF;
      
      -- Calcular comissão de indicação
      v_commission := v_net_amount * v_referral.commission_rate;
      
      -- Registrar comissão
      INSERT INTO public.referral_commissions (
        referral_id, order_id, sale_net_amount, commission_amount, currency, status
      ) VALUES (
        v_referral.id, NEW.id, v_net_amount, v_commission, v_currency, 'credited'
      )
      ON CONFLICT (referral_id, order_id) DO NOTHING;
      
      -- Adicionar ao saldo do indicador
      INSERT INTO public.balance_transactions (
        user_id, type, amount, currency, description, order_id
      ) VALUES (
        v_referral.referrer_id,
        'referral_commission',
        v_commission,
        v_currency,
        'Comissão de indicação - Venda de ' || (
          SELECT full_name FROM public.profiles WHERE user_id = v_seller_id
        ),
        NEW.id
      );
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 10. Trigger para processar comissões
DROP TRIGGER IF EXISTS trigger_process_referral_commission ON public.orders;
CREATE TRIGGER trigger_process_referral_commission
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.process_referral_commission();

-- 11. Função para expirar indicações automaticamente
CREATE OR REPLACE FUNCTION public.expire_referrals()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.seller_referrals
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;