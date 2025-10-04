-- Adicionar coluna de preço comparativo à tabela products
ALTER TABLE public.products 
ADD COLUMN compare_at_price text;

COMMENT ON COLUMN public.products.compare_at_price IS 'Preço original/comparativo para mostrar desconto (antes)';
