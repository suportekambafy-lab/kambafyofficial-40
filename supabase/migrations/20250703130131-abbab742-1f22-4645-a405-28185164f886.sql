-- Create member_areas table
CREATE TABLE public.member_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.member_areas ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own member areas" 
ON public.member_areas 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own member areas" 
ON public.member_areas 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own member areas" 
ON public.member_areas 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own member areas" 
ON public.member_areas 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_member_areas_updated_at
BEFORE UPDATE ON public.member_areas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public) VALUES ('member-videos', 'member-videos', false);

-- Create storage policies for video uploads
CREATE POLICY "Users can upload their own videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'member-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own videos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'member-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own videos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'member-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own videos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'member-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add member_area_id to lessons table
ALTER TABLE public.lessons ADD COLUMN member_area_id UUID REFERENCES public.member_areas(id) ON DELETE CASCADE;