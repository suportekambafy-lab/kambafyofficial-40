-- Create table to track sent announcements
CREATE TABLE IF NOT EXISTS public.app_announcement_sent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  announcement_type TEXT NOT NULL DEFAULT 'app_launch',
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_announcement_sent ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_announcement_sent_email_type 
ON public.app_announcement_sent(email, announcement_type);

-- System can insert records
CREATE POLICY "System can insert sent records"
ON public.app_announcement_sent
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Admins can view sent records
CREATE POLICY "Admins can view sent records"
ON public.app_announcement_sent
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.email = get_current_user_email()
    AND admin_users.is_active = true
  )
);