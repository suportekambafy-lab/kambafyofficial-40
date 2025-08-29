-- Add logo field to member areas for login page
ALTER TABLE public.member_areas ADD COLUMN logo_url text;

-- Create storage bucket for member area assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('member-area-assets', 'member-area-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for member area assets
CREATE POLICY "Member area owners can upload assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'member-area-assets' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Member area owners can update their assets" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'member-area-assets' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Member area owners can delete their assets" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'member-area-assets' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Member area assets are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'member-area-assets');