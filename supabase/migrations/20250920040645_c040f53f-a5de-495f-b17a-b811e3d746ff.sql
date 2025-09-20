-- Adicionar coluna para preços personalizados por país
ALTER TABLE public.products 
ADD COLUMN custom_prices JSONB DEFAULT '{}'::jsonb;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.products.custom_prices IS 'Preços personalizados por país no formato: {"AO": "45000", "PT": "150", "MZ": "3500"}';

-- Criar índice para otimizar consultas
CREATE INDEX idx_products_custom_prices ON public.products USING GIN (custom_prices);