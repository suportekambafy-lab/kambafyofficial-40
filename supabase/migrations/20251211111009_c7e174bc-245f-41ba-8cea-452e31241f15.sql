-- Adicionar coluna cover_image_url na tabela lessons
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS cover_image_url text;