-- Add hero/banner image fields to member_areas table
ALTER TABLE public.member_areas 
ADD COLUMN hero_image_url TEXT,
ADD COLUMN hero_title TEXT,
ADD COLUMN hero_description TEXT;

-- Add cover image field to modules table
ALTER TABLE public.modules 
ADD COLUMN cover_image_url TEXT;