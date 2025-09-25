-- Adicionar coluna video_current_time para salvar a posição do vídeo onde o aluno parou
ALTER TABLE public.lesson_progress 
ADD COLUMN IF NOT EXISTS video_current_time INTEGER DEFAULT 0;