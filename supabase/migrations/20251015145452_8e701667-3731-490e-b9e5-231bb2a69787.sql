-- Adicionar campo business_name (nome fantasia) na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_name text;