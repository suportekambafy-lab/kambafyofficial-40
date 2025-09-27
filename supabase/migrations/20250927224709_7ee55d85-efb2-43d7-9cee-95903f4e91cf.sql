-- Adicionar campos para preço aberto nos produtos
ALTER TABLE public.products 
ADD COLUMN allow_custom_price boolean DEFAULT false,
ADD COLUMN minimum_price numeric DEFAULT 0,
ADD COLUMN suggested_price numeric DEFAULT NULL;

-- Comentários para documentar os campos
COMMENT ON COLUMN public.products.allow_custom_price IS 'Permite que o cliente defina o preço que deseja pagar';
COMMENT ON COLUMN public.products.minimum_price IS 'Preço mínimo quando allow_custom_price é true';
COMMENT ON COLUMN public.products.suggested_price IS 'Preço sugerido quando allow_custom_price é true';