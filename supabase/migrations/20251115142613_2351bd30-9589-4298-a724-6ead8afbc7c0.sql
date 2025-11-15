-- Create table to track announcement sending progress
CREATE TABLE IF NOT EXISTS public.app_announcement_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  total_users INTEGER NOT NULL DEFAULT 0,
  sent INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed'
  announcement_type TEXT NOT NULL DEFAULT 'app_launch',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.app_announcement_progress ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_announcement_progress_status 
ON public.app_announcement_progress(status, updated_at DESC);

-- System can insert and update records
CREATE POLICY "System can manage progress records"
ON public.app_announcement_progress
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable realtime
ALTER TABLE public.app_announcement_progress REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_announcement_progress;