-- Adicionar coluna para motivo do banimento na tabela products
ALTER TABLE public.products 
ADD COLUMN ban_reason TEXT NULL;