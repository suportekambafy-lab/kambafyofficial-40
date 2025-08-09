-- Corrigir problema RLS na tabela admin_dashboard_stats
ALTER TABLE public.admin_dashboard_stats ENABLE ROW LEVEL SECURITY;

-- Criar política para admin_dashboard_stats
CREATE POLICY "Only admins can view dashboard stats" ON public.admin_dashboard_stats
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM admin_users 
  WHERE email = get_current_user_email() 
  AND is_active = true
));