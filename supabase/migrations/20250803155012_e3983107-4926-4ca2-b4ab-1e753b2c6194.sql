-- Adicionar coluna allow_affiliates na tabela products
ALTER TABLE public.products 
ADD COLUMN allow_affiliates boolean DEFAULT false;