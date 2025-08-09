-- Enable RLS on the admin_dashboard_stats table that was flagged
ALTER TABLE public.admin_dashboard_stats ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for admin_dashboard_stats
CREATE POLICY "Admin users can view dashboard stats" 
ON public.admin_dashboard_stats 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM admin_users 
  WHERE admin_users.email = get_current_user_email() 
  AND admin_users.is_active = true
));