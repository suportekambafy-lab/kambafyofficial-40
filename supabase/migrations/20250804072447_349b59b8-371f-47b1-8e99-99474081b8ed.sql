-- Habilitar RLS na tabela admin_dashboard_stats
ALTER TABLE public.admin_dashboard_stats ENABLE ROW LEVEL SECURITY;

-- Política para que apenas admins possam ver os stats
CREATE POLICY "Only admins can view dashboard stats" 
ON public.admin_dashboard_stats 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE email = get_current_user_email() 
      AND is_active = true
  )
);

-- Política para que apenas admins possam inserir/atualizar stats
CREATE POLICY "Only admins can modify dashboard stats" 
ON public.admin_dashboard_stats 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE email = get_current_user_email() 
      AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE email = get_current_user_email() 
      AND is_active = true
  )
);