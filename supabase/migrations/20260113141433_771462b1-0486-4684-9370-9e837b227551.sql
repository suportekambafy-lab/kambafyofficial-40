-- Tabela de candidaturas ao programa de indicação
CREATE TABLE public.referral_program_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  
  -- Dados da candidatura
  instagram_url TEXT,
  youtube_url TEXT,
  tiktok_url TEXT,
  facebook_url TEXT,
  other_social_url TEXT,
  audience_size TEXT, -- Ex: "1k-10k", "10k-50k", etc.
  motivation TEXT, -- Por que quer participar
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  
  -- Após aprovação
  referral_code TEXT UNIQUE,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE public.referral_program_applications ENABLE ROW LEVEL SECURITY;

-- Usuário pode ver sua própria candidatura
CREATE POLICY "Users can view their own application"
ON public.referral_program_applications
FOR SELECT
USING (auth.uid() = user_id);

-- Usuário pode criar sua candidatura
CREATE POLICY "Users can create their own application"
ON public.referral_program_applications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Usuário pode atualizar candidatura pendente
CREATE POLICY "Users can update pending application"
ON public.referral_program_applications
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

-- Função para gerar código único
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Gera código alfanumérico de 8 caracteres
    new_code := upper(substr(md5(random()::text), 1, 8));
    
    -- Verifica se já existe
    SELECT EXISTS (
      SELECT 1 FROM referral_program_applications WHERE referral_code = new_code
    ) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_referral_applications_updated_at
BEFORE UPDATE ON public.referral_program_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();