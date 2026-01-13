-- Adicionar status 'awaiting_approval' para indicações que aguardam KYC
-- e criar trigger para ativar quando KYC for aprovado

-- Atualizar função de ativação para considerar KYC aprovado
CREATE OR REPLACE FUNCTION activate_referral_on_kyc_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando uma verificação de identidade é aprovada
  IF NEW.status = 'aprovado' AND (OLD.status IS DISTINCT FROM 'aprovado') THEN
    -- Verificar se o usuário tem uma indicação pendente
    UPDATE seller_referrals
    SET status = 'awaiting_first_sale',
        updated_at = NOW()
    WHERE referred_id = NEW.user_id
      AND status = 'pending';
    
    -- Se houver indicação, notificar o indicador
    IF FOUND THEN
      INSERT INTO seller_notifications (user_id, type, title, message, data)
      SELECT 
        sr.referrer_id,
        'referral_approved',
        'Indicação aprovada!',
        'O vendedor que você indicou foi verificado e está pronto para vender.',
        jsonb_build_object('referral_id', sr.id, 'referred_id', NEW.user_id)
      FROM seller_referrals sr
      WHERE sr.referred_id = NEW.user_id
        AND sr.status = 'awaiting_first_sale';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger na tabela identity_verification
DROP TRIGGER IF EXISTS trigger_activate_referral_on_kyc ON identity_verification;
CREATE TRIGGER trigger_activate_referral_on_kyc
  AFTER UPDATE ON identity_verification
  FOR EACH ROW
  EXECUTE FUNCTION activate_referral_on_kyc_approval();

-- Atualizar a função process_referral_commission para só processar indicações 'active'
-- (já está correto, mas vamos garantir)

-- Modificar a função para ativar na primeira venda APENAS se já passou pelo KYC
CREATE OR REPLACE FUNCTION process_referral_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_referral RECORD;
  v_commission_amount NUMERIC;
  v_seller_commission NUMERIC;
  v_product_user_id UUID;
BEGIN
  -- Apenas processar quando order muda para 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    
    -- Buscar user_id do produto
    SELECT user_id INTO v_product_user_id
    FROM products
    WHERE id = NEW.product_id;
    
    IF v_product_user_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Buscar indicação do vendedor (status 'awaiting_first_sale' ou 'active')
    SELECT * INTO v_referral
    FROM seller_referrals
    WHERE referred_id = v_product_user_id
      AND status IN ('awaiting_first_sale', 'active')
      AND (expires_at IS NULL OR expires_at > NOW());
    
    IF v_referral IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Se for a primeira venda (status ainda é 'awaiting_first_sale')
    IF v_referral.status = 'awaiting_first_sale' THEN
      -- Verificar se indicador já escolheu a opção de recompensa
      IF v_referral.reward_option IS NULL THEN
        -- Não pode ativar sem escolher a opção, deixar pendente
        RETURN NEW;
      END IF;
      
      -- Ativar a indicação
      UPDATE seller_referrals
      SET status = 'active',
          first_sale_at = NOW(),
          expires_at = NOW() + (v_referral.duration_months || ' months')::INTERVAL,
          updated_at = NOW()
      WHERE id = v_referral.id;
      
      -- Atualizar referência local
      v_referral.status := 'active';
      v_referral.first_sale_at := NOW();
    END IF;
    
    -- Calcular comissão (sobre o valor líquido)
    v_seller_commission := COALESCE(NEW.seller_commission, NEW.amount * 0.9);
    v_commission_amount := v_seller_commission * v_referral.commission_rate;
    
    -- Registrar comissão
    INSERT INTO referral_commissions (
      referral_id,
      order_id,
      sale_net_amount,
      commission_amount,
      currency,
      status
    ) VALUES (
      v_referral.id,
      NEW.id,
      v_seller_commission,
      v_commission_amount,
      NEW.currency,
      'pending'
    );
    
    -- Adicionar ao saldo do indicador
    INSERT INTO balance_transactions (
      user_id,
      type,
      amount,
      currency,
      description,
      order_id
    ) VALUES (
      v_referral.referrer_id,
      'referral_commission',
      v_commission_amount,
      NEW.currency,
      'Comissão de indicação - Venda #' || LEFT(NEW.id::TEXT, 8),
      NEW.id
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Garantir que o trigger existe
DROP TRIGGER IF EXISTS trigger_process_referral_commission ON orders;
CREATE TRIGGER trigger_process_referral_commission
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION process_referral_commission();

-- Adicionar comentário explicativo
COMMENT ON FUNCTION activate_referral_on_kyc_approval() IS 
'Ativa indicação quando vendedor indicado tem KYC aprovado pelo admin';