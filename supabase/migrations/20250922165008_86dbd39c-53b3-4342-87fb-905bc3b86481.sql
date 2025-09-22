-- Corrigir campos NOT NULL problemáticos na tabela order_bump_settings
-- Os campos bump_product_name e bump_product_price devem ser nullable
-- pois nem todos os tipos de order bump (como access_extension) precisam deles

-- Tornar bump_product_name nullable
ALTER TABLE public.order_bump_settings 
ALTER COLUMN bump_product_name DROP NOT NULL;

-- Tornar bump_product_price nullable  
ALTER TABLE public.order_bump_settings 
ALTER COLUMN bump_product_price DROP NOT NULL;

-- Adicionar valores padrão para registros existentes que podem ter problemas
UPDATE public.order_bump_settings 
SET 
  bump_product_name = COALESCE(bump_product_name, CASE 
    WHEN bump_type = 'access_extension' THEN COALESCE(access_extension_description, 'Extensão de Acesso')
    ELSE 'Produto Extra'
  END),
  bump_product_price = COALESCE(bump_product_price, '0')
WHERE bump_product_name IS NULL OR bump_product_price IS NULL;

-- Limpar o registro de teste que falhou antes
DELETE FROM public.order_bump_settings 
WHERE title = 'Teste Order Bump 2';

-- Verificar estado atual da tabela
SELECT id, product_id, bump_category, bump_order, bump_product_name, bump_product_price 
FROM public.order_bump_settings 
ORDER BY product_id, bump_order;