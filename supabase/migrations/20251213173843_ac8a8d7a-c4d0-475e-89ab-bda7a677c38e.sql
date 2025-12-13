-- Tabela de créditos de chat do vendedor
CREATE TABLE public.seller_chat_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token_balance BIGINT NOT NULL DEFAULT 0,
  total_tokens_purchased BIGINT NOT NULL DEFAULT 0,
  total_tokens_used BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT seller_chat_credits_user_id_unique UNIQUE (user_id)
);

-- Tabela de pacotes de tokens
CREATE TABLE public.chat_token_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  tokens INTEGER NOT NULL,
  price_kz INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de transações de tokens
CREATE TABLE public.chat_token_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'bonus', 'refund')),
  tokens INTEGER NOT NULL,
  balance_after BIGINT NOT NULL,
  package_id UUID REFERENCES public.chat_token_packages(id),
  conversation_id UUID REFERENCES public.chat_conversations(id),
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar coluna de configuração de chat nos produtos
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS chat_config JSONB DEFAULT '{"greeting": "Olá! Como posso ajudar?", "tone": "friendly"}'::jsonb;

-- Inserir os 4 pacotes definidos
INSERT INTO public.chat_token_packages (name, description, tokens, price_kz, sort_order) VALUES
  ('Starter', '~200 mensagens - Ideal para começar', 50000, 10000, 1),
  ('Básico', '~600 mensagens - Para vendedores ativos', 150000, 19000, 2),
  ('Pro', '~2.000 mensagens - Melhor custo-benefício', 500000, 25000, 3),
  ('Business', '~6.000 mensagens - Alto volume', 1500000, 30000, 4);

-- Enable RLS
ALTER TABLE public.seller_chat_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_token_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_token_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies para seller_chat_credits
CREATE POLICY "Users can view their own credits"
  ON public.seller_chat_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credits"
  ON public.seller_chat_credits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can manage all credits"
  ON public.seller_chat_credits FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies para chat_token_packages
CREATE POLICY "Anyone can view active packages"
  ON public.chat_token_packages FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage packages"
  ON public.chat_token_packages FOR ALL
  USING (is_active_admin_by_auth_id())
  WITH CHECK (is_active_admin_by_auth_id());

-- RLS Policies para chat_token_transactions
CREATE POLICY "Users can view their own transactions"
  ON public.chat_token_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions"
  ON public.chat_token_transactions FOR INSERT
  WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_seller_chat_credits_updated_at
  BEFORE UPDATE ON public.seller_chat_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();