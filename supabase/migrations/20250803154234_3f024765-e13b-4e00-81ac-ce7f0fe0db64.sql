-- Adicionar campos de email e suporte/contato na tabela products
ALTER TABLE public.products 
ADD COLUMN support_email text,
ADD COLUMN support_whatsapp text;