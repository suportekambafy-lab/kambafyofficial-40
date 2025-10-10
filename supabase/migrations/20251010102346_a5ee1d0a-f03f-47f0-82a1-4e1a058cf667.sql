-- Adicionar product_id à tabela facebook_api_settings para suportar múltiplas APIs por produto
ALTER TABLE public.facebook_api_settings 
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE CASCADE;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_facebook_api_settings_product_id 
ON public.facebook_api_settings(product_id);

-- Comentário explicativo
COMMENT ON COLUMN public.facebook_api_settings.product_id IS 'Permite múltiplas configurações de API por produto específico';