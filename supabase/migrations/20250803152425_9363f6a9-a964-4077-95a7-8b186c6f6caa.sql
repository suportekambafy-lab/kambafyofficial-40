-- Adicionar coluna de categoria na tabela products
ALTER TABLE public.products 
ADD COLUMN category text;