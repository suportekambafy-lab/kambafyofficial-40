-- Create utmify_settings table
CREATE TABLE public.utmify_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  api_token TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.utmify_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own utmify settings"
  ON public.utmify_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own utmify settings"
  ON public.utmify_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own utmify settings"
  ON public.utmify_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own utmify settings"
  ON public.utmify_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_utmify_settings_updated_at
  BEFORE UPDATE ON public.utmify_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();