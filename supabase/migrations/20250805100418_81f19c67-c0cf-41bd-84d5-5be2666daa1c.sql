-- Enable RLS on admin_dashboard_stats table to fix security warning
ALTER TABLE public.admin_dashboard_stats ENABLE ROW LEVEL SECURITY;

-- Create policy for admin dashboard stats
CREATE POLICY "Admin can view dashboard stats" 
ON public.admin_dashboard_stats 
FOR SELECT 
USING (EXISTS (
  SELECT 1 
  FROM admin_users 
  WHERE email = get_current_user_email() 
    AND is_active = true
));