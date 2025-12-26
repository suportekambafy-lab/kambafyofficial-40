-- Create reports table for storing user reports
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_name TEXT,
  reporter_email TEXT NOT NULL,
  reported_url TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.admin_users(id),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert reports (public form)
CREATE POLICY "Anyone can submit reports"
ON public.reports
FOR INSERT
WITH CHECK (true);

-- Only active admins can view reports
CREATE POLICY "Active admins can view reports"
ON public.reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.email = get_current_user_email()
    AND admin_users.is_active = true
  )
);

-- Only active admins can update reports
CREATE POLICY "Active admins can update reports"
ON public.reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.email = get_current_user_email()
    AND admin_users.is_active = true
  )
);

-- Create index for faster queries
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_created_at ON public.reports(created_at DESC);

-- Trigger to update updated_at
CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create admin notification on new report
CREATE OR REPLACE FUNCTION public.create_report_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_notifications (
    type, title, message, entity_type, entity_id, data
  ) VALUES (
    'report',
    'Nova Denúncia: ' || NEW.category,
    'Denúncia recebida de ' || COALESCE(NEW.reporter_name, 'Anônimo') || ' sobre: ' || LEFT(NEW.reported_url, 50),
    'report',
    NEW.id,
    jsonb_build_object(
      'category', NEW.category,
      'reporter_email', NEW.reporter_email,
      'reported_url', NEW.reported_url
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_report_created
AFTER INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.create_report_notification();