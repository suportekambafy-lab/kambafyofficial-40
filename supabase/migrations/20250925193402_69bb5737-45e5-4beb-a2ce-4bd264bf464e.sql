-- Add scheduling fields to lessons table
ALTER TABLE public.lessons 
ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN is_scheduled BOOLEAN DEFAULT false;

-- Add coming soon field to modules table  
ALTER TABLE public.modules
ADD COLUMN coming_soon BOOLEAN DEFAULT false;