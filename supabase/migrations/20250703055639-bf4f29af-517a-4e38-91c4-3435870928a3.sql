
-- Criar tabela para configurações de webhooks
CREATE TABLE public.webhook_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] DEFAULT '{}',
  secret TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela para configurações do Facebook Pixel
CREATE TABLE public.facebook_pixel_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pixel_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela para configurações da API do Facebook
CREATE TABLE public.facebook_api_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  app_id TEXT NOT NULL,
  app_secret TEXT NOT NULL,
  access_token TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela para logs de webhooks
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  webhook_id UUID REFERENCES public.webhook_settings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS para todas as tabelas
ALTER TABLE public.webhook_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_pixel_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_api_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para webhook_settings
CREATE POLICY "Users can view their own webhook settings"
  ON public.webhook_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own webhook settings"
  ON public.webhook_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webhook settings"
  ON public.webhook_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webhook settings"
  ON public.webhook_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas RLS para facebook_pixel_settings
CREATE POLICY "Users can view their own pixel settings"
  ON public.facebook_pixel_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pixel settings"
  ON public.facebook_pixel_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pixel settings"
  ON public.facebook_pixel_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pixel settings"
  ON public.facebook_pixel_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas RLS para facebook_api_settings
CREATE POLICY "Users can view their own api settings"
  ON public.facebook_api_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own api settings"
  ON public.facebook_api_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own api settings"
  ON public.facebook_api_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own api settings"
  ON public.facebook_api_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas RLS para webhook_logs
CREATE POLICY "Users can view their own webhook logs"
  ON public.webhook_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own webhook logs"
  ON public.webhook_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Triggers para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_webhook_settings_updated_at
  BEFORE UPDATE ON public.webhook_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facebook_pixel_settings_updated_at
  BEFORE UPDATE ON public.facebook_pixel_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facebook_api_settings_updated_at
  BEFORE UPDATE ON public.facebook_api_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
