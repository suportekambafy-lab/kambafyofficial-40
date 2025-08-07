
-- Criar tabela para configurações de 2FA dos usuários
CREATE TABLE public.user_2fa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  method TEXT CHECK (method IN ('email', 'sms', 'whatsapp', 'authenticator')) DEFAULT 'email',
  phone_number TEXT,
  backup_codes TEXT[], -- códigos de backup para emergência
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Criar tabela para rastrear dispositivos confiáveis
CREATE TABLE public.trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  ip_address TEXT,
  location TEXT,
  last_used TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela para histórico de logins e ações sensíveis
CREATE TABLE public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT CHECK (event_type IN ('login', 'password_change', 'bank_details_change', 'withdrawal', 'suspicious_ip')) NOT NULL,
  ip_address TEXT,
  location TEXT,
  device_fingerprint TEXT,
  requires_2fa BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Políticas RLS para as novas tabelas
ALTER TABLE public.user_2fa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver e gerenciar suas próprias configurações 2FA
CREATE POLICY "Users can manage their own 2FA settings" 
  ON public.user_2fa_settings 
  FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem ver e gerenciar seus próprios dispositivos confiáveis
CREATE POLICY "Users can manage their own trusted devices" 
  ON public.trusted_devices 
  FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem ver seus próprios eventos de segurança
CREATE POLICY "Users can view their own security events" 
  ON public.security_events 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Sistema pode inserir eventos de segurança
CREATE POLICY "System can insert security events" 
  ON public.security_events 
  FOR INSERT 
  WITH CHECK (true);

-- Função para verificar se um dispositivo é confiável
CREATE OR REPLACE FUNCTION public.is_trusted_device(
  _user_id UUID, 
  _device_fingerprint TEXT
) RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.trusted_devices 
    WHERE user_id = _user_id 
      AND device_fingerprint = _device_fingerprint 
      AND expires_at > now()
  );
$$;

-- Função para verificar se IP é suspeito (simplified version)
CREATE OR REPLACE FUNCTION public.is_suspicious_ip(
  _user_id UUID, 
  _ip_address TEXT
) RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  -- Verifica se é um IP completamente novo para o usuário
  SELECT NOT EXISTS (
    SELECT 1 
    FROM public.security_events 
    WHERE user_id = _user_id 
      AND ip_address = _ip_address
      AND created_at > (now() - INTERVAL '90 days')
  );
$$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_2fa_settings_updated_at 
  BEFORE UPDATE ON public.user_2fa_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
