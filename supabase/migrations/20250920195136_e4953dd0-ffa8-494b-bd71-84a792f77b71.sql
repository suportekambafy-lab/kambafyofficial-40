-- Adicionar coluna bump_product_id para referenciar produtos nos order bumps
ALTER TABLE public.order_bump_settings 
ADD COLUMN bump_product_id UUID REFERENCES public.products(id);

-- Criar índice para melhor performance
CREATE INDEX idx_order_bump_settings_bump_product_id ON public.order_bump_settings(bump_product_id);

-- Comentários para documentação
COMMENT ON COLUMN public.order_bump_settings.bump_product_id IS 'Referência ao produto usado no order bump para acessar preços personalizados';