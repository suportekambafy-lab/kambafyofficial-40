-- Create table for member area authentication sessions
CREATE TABLE public.member_area_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_area_id UUID NOT NULL REFERENCES public.member_areas(id) ON DELETE CASCADE,
  student_email TEXT NOT NULL,
  student_name TEXT NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.member_area_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for member area sessions
CREATE POLICY "Students can view their own sessions" 
ON public.member_area_sessions 
FOR SELECT 
USING (student_email = current_setting('app.current_student_email', true));

CREATE POLICY "System can manage sessions" 
ON public.member_area_sessions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_member_area_sessions_token ON public.member_area_sessions(session_token);
CREATE INDEX idx_member_area_sessions_email_area ON public.member_area_sessions(member_area_id, student_email);
CREATE INDEX idx_member_area_sessions_expires ON public.member_area_sessions(expires_at);

-- Add function to clean expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_member_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.member_area_sessions
  WHERE expires_at < now();
END;
$$;

-- Add updated_at trigger
CREATE TRIGGER update_member_area_sessions_updated_at
  BEFORE UPDATE ON public.member_area_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();