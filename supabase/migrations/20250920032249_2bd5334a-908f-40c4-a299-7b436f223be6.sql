-- Permitir múltiplos order bumps por produto (produto + extensão)
-- Remover constraint única de product_id para permitir múltiplos order bumps
ALTER TABLE public.order_bump_settings 
DROP CONSTRAINT IF EXISTS order_bump_settings_product_id_key;

-- Adicionar campo para categorizar os order bumps
ALTER TABLE public.order_bump_settings 
ADD COLUMN IF NOT EXISTS bump_category VARCHAR(50) DEFAULT 'product';

-- Comentário explicativo
COMMENT ON COLUMN public.order_bump_settings.bump_category IS 'Categoria do order bump: product_extra ou access_extension';

-- Criar constraint única composta para permitir um order bump por categoria por produto
ALTER TABLE public.order_bump_settings 
ADD CONSTRAINT order_bump_settings_product_category_unique 
UNIQUE (product_id, bump_category);

-- Migrar dados existentes para categorizar como product_extra ou access_extension
UPDATE public.order_bump_settings 
SET bump_category = CASE 
  WHEN bump_type = 'access_extension' THEN 'access_extension'
  ELSE 'product_extra'
END;