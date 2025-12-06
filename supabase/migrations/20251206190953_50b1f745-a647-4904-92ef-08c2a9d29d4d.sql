-- Adicionar campo para vídeo de capa na área de membros
ALTER TABLE public.member_areas 
ADD COLUMN IF NOT EXISTS hero_video_url TEXT DEFAULT NULL;