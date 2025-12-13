-- Create google_analytics_settings table
CREATE TABLE public.google_analytics_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  measurement_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_analytics_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own Google Analytics settings"
ON public.google_analytics_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own Google Analytics settings"
ON public.google_analytics_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Google Analytics settings"
ON public.google_analytics_settings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Google Analytics settings"
ON public.google_analytics_settings
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_google_analytics_settings_updated_at
BEFORE UPDATE ON public.google_analytics_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();