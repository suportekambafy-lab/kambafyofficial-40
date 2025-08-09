-- Criar tabela para códigos 2FA
CREATE TABLE IF NOT EXISTS public.two_factor_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  code TEXT NOT NULL,
  event_type TEXT NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.two_factor_codes ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Usuários podem ver seus próprios códigos 2FA" 
ON public.two_factor_codes 
FOR SELECT 
USING (true); -- Permitir acesso para verificação

CREATE POLICY "Sistema pode inserir códigos 2FA" 
ON public.two_factor_codes 
FOR INSERT 
WITH CHECK (true); -- Permitir inserção pelo sistema

CREATE POLICY "Sistema pode atualizar códigos 2FA" 
ON public.two_factor_codes 
FOR UPDATE 
USING (true); -- Permitir atualização pelo sistema

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_two_factor_codes_email_event 
ON public.two_factor_codes (user_email, event_type);

CREATE INDEX IF NOT EXISTS idx_two_factor_codes_code 
ON public.two_factor_codes (code);

CREATE INDEX IF NOT EXISTS idx_two_factor_codes_expires 
ON public.two_factor_codes (expires_at);