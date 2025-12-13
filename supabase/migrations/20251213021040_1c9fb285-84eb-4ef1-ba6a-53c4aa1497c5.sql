-- Create table for TikTok Pixel settings
CREATE TABLE public.tiktok_pixel_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  pixel_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  events TEXT[] DEFAULT ARRAY['purchase', 'initiate_checkout', 'view_content'],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tiktok_pixel_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own TikTok pixel settings" 
ON public.tiktok_pixel_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own TikTok pixel settings" 
ON public.tiktok_pixel_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own TikTok pixel settings" 
ON public.tiktok_pixel_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own TikTok pixel settings" 
ON public.tiktok_pixel_settings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tiktok_pixel_settings_updated_at
BEFORE UPDATE ON public.tiktok_pixel_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();