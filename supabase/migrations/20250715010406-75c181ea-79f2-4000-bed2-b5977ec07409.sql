-- Adicionar coluna para armazenar dados do order bump na tabela orders
ALTER TABLE public.orders 
ADD COLUMN order_bump_data JSONB NULL;