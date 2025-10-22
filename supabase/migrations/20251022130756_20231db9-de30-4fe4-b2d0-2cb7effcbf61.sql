-- Adicionar coluna de anexos na tabela de posts
ALTER TABLE public.community_posts 
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;