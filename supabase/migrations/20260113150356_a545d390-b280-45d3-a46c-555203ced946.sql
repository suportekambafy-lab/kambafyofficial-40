-- Tabela para rastrear cliques nos links de indicação
CREATE TABLE IF NOT EXISTS public.referral_link_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code TEXT NOT NULL,
  referrer_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index para performance
CREATE INDEX idx_referral_link_clicks_code ON public.referral_link_clicks(referral_code);
CREATE INDEX idx_referral_link_clicks_referrer ON public.referral_link_clicks(referrer_id);
CREATE INDEX idx_referral_link_clicks_created ON public.referral_link_clicks(created_at);

-- Enable RLS
ALTER TABLE public.referral_link_clicks ENABLE ROW LEVEL SECURITY;

-- Política para inserção pública (qualquer um pode registrar clique)
CREATE POLICY "Anyone can insert clicks" 
ON public.referral_link_clicks 
FOR INSERT 
WITH CHECK (true);

-- Política para leitura (apenas o dono do código pode ver seus cliques)
CREATE POLICY "Users can view their own clicks" 
ON public.referral_link_clicks 
FOR SELECT 
USING (referrer_id = auth.uid());

-- Função para registrar clique no link (bypass RLS para buscar referrer_id)
CREATE OR REPLACE FUNCTION track_referral_click(
  p_referral_code TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  -- Buscar o referrer_id pelo código
  SELECT user_id INTO v_referrer_id
  FROM referral_program_applications
  WHERE referral_code = p_referral_code
    AND status = 'approved';
  
  -- Se não encontrou, retorna erro
  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Código não encontrado');
  END IF;
  
  -- Inserir o clique
  INSERT INTO referral_link_clicks (
    referral_code,
    referrer_id,
    ip_address,
    user_agent,
    country,
    city
  ) VALUES (
    p_referral_code,
    v_referrer_id,
    p_ip_address,
    p_user_agent,
    p_country,
    p_city
  );
  
  RETURN json_build_object('success', true);
END;
$$;