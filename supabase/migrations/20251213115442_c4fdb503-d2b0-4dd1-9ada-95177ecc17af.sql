-- Adicionar coluna utm_params à tabela orders para armazenar parâmetros de rastreamento
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utm_params jsonb DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.orders.utm_params IS 'Armazena parâmetros UTM e tracking (src, sck, utm_source, utm_medium, utm_campaign, utm_content, utm_term)';