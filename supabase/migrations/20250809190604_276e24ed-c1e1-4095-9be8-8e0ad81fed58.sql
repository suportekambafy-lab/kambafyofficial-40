-- Verificar se a tabela sales_recovery_settings existe, se não existir, criar
CREATE TABLE IF NOT EXISTS public.sales_recovery_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  email_delay_hours INTEGER NOT NULL DEFAULT 24,
  email_subject TEXT NOT NULL DEFAULT 'Complete sua compra - Oferta especial aguarda!',
  email_template TEXT NOT NULL DEFAULT 'Olá {customer_name},

Notamos que você iniciou uma compra do produto ''{product_name}'' mas não finalizou o pagamento.

Complete agora e aproveite esta oportunidade!

Valor: {amount} {currency}

Clique aqui para finalizar: {checkout_url}

Obrigado!',
  max_recovery_attempts INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Habilitar RLS
ALTER TABLE public.sales_recovery_settings ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se existirem
DROP POLICY IF EXISTS "Users can manage their own sales recovery settings" ON public.sales_recovery_settings;
DROP POLICY IF EXISTS "Public can view active sales recovery settings for checkout" ON public.sales_recovery_settings;

-- Criar políticas RLS
CREATE POLICY "Users can manage their own sales recovery settings" 
ON public.sales_recovery_settings 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view active sales recovery settings for checkout" 
ON public.sales_recovery_settings 
FOR SELECT 
USING (enabled = true);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_sales_recovery_settings_updated_at ON public.sales_recovery_settings;
CREATE TRIGGER update_sales_recovery_settings_updated_at
    BEFORE UPDATE ON public.sales_recovery_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();