-- FASE 5: Proteções e Validações no Database

-- 1. Criar função para prevenir IDs de teste
CREATE OR REPLACE FUNCTION prevent_test_data_ids()
RETURNS TRIGGER AS $$
BEGIN
  -- Bloquear produtos com IDs repetitivos (pattern de teste)
  IF TG_TABLE_NAME = 'products' THEN
    IF NEW.id::text ~ '^[a]{8}-[a]{4}-[a]{4}-[a]{4}-[a]{12}$' 
       OR NEW.id::text ~ '^[0]{8}-[0]{4}-[0]{4}-[0]{4}-[0]{12}$' THEN
      RAISE EXCEPTION 'ID de produto inválido: padrão de teste detectado (%))', NEW.id;
    END IF;
  END IF;
  
  -- Bloquear order_ids com prefixos de teste
  IF TG_TABLE_NAME = 'orders' THEN
    IF NEW.order_id ~ '^(LEO_|TEST_|FAKE_|DEBUG_)' THEN
      RAISE EXCEPTION 'Order ID inválido: prefixo de teste detectado (%)', NEW.order_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Aplicar trigger em products
DROP TRIGGER IF EXISTS prevent_test_products ON products;
CREATE TRIGGER prevent_test_products
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION prevent_test_data_ids();

-- 3. Aplicar trigger em orders
DROP TRIGGER IF EXISTS prevent_test_orders ON orders;
CREATE TRIGGER prevent_test_orders
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION prevent_test_data_ids();

-- 4. Criar tabela para rastrear sessões de impersonation
CREATE TABLE IF NOT EXISTS public.admin_impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  target_user_id UUID NOT NULL,
  target_user_email TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  read_only_mode BOOLEAN NOT NULL DEFAULT true,
  actions_performed JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. Habilitar RLS na tabela de sessões
ALTER TABLE public.admin_impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS: apenas admins podem ver sessões
CREATE POLICY "Admin users can view impersonation sessions"
  ON public.admin_impersonation_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE email = get_current_user_email()
      AND is_active = true
    )
  );

-- 7. Sistema pode inserir sessões
CREATE POLICY "System can insert impersonation sessions"
  ON public.admin_impersonation_sessions
  FOR INSERT
  WITH CHECK (true);

-- 8. Sistema pode atualizar sessões
CREATE POLICY "System can update impersonation sessions"
  ON public.admin_impersonation_sessions
  FOR UPDATE
  USING (true);

-- 9. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_admin 
  ON public.admin_impersonation_sessions(admin_email);
CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_target 
  ON public.admin_impersonation_sessions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_active 
  ON public.admin_impersonation_sessions(is_active) 
  WHERE is_active = true;

-- 10. Criar função para limpar sessões expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_impersonation_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.admin_impersonation_sessions
  SET is_active = false,
      ended_at = NOW()
  WHERE is_active = true
    AND expires_at < NOW();
END;
$$;

-- 11. Adicionar campos de auditoria em tabelas críticas
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS created_by_impersonation BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS impersonation_session_id UUID REFERENCES admin_impersonation_sessions(id);

ALTER TABLE public.balance_transactions 
  ADD COLUMN IF NOT EXISTS created_by_impersonation BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS impersonation_session_id UUID REFERENCES admin_impersonation_sessions(id);

ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS created_by_impersonation BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS impersonation_session_id UUID REFERENCES admin_impersonation_sessions(id);

-- 12. Comentários de documentação
COMMENT ON TABLE public.admin_impersonation_sessions IS 'Rastreia todas as sessões de impersonation de admins, com limite de tempo e modo somente-leitura por padrão';
COMMENT ON COLUMN public.admin_impersonation_sessions.read_only_mode IS 'Quando true, o admin só pode visualizar dados, não pode criar/modificar';
COMMENT ON COLUMN public.admin_impersonation_sessions.actions_performed IS 'Array JSON com registro de todas as ações executadas durante a sessão';
COMMENT ON FUNCTION prevent_test_data_ids() IS 'Previne criação de dados com padrões de teste (IDs repetitivos, prefixos TEST/LEO/FAKE)';
COMMENT ON FUNCTION cleanup_expired_impersonation_sessions() IS 'Desativa automaticamente sessões de impersonation expiradas';