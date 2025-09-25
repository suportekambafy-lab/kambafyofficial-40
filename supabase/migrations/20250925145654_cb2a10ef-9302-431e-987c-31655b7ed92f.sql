-- Add video fields to lessons table for Bunny.net integration
ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS bunny_video_id text,
ADD COLUMN IF NOT EXISTS bunny_embed_url text,
ADD COLUMN IF NOT EXISTS video_data jsonb;