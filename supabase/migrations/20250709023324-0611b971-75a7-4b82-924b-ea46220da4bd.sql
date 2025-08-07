
-- Criar tabela para armazenar administradores
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Inserir o usuário administrador padrão
INSERT INTO public.admin_users (email, password_hash, full_name) 
VALUES ('suporte@kambafy.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Suporte Kambafy');

-- Adicionar coluna admin_approved aos produtos
ALTER TABLE public.products 
ADD COLUMN admin_approved BOOLEAN DEFAULT false;

-- Adicionar coluna banned aos profiles
ALTER TABLE public.profiles 
ADD COLUMN banned BOOLEAN DEFAULT false;

-- Adicionar colunas admin_notes e admin_processed_by aos withdrawal_requests
ALTER TABLE public.withdrawal_requests 
ADD COLUMN admin_notes TEXT,
ADD COLUMN admin_processed_by UUID REFERENCES public.admin_users(id);

-- Criar tabela para logs de ações administrativas
CREATE TABLE public.admin_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES public.admin_users(id) NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar view para estatísticas do dashboard
CREATE OR REPLACE VIEW public.admin_dashboard_stats AS
SELECT 
  (SELECT COUNT(*) FROM public.profiles) as total_users,
  (SELECT COUNT(*) FROM public.products WHERE status = 'Ativo') as total_products,
  (SELECT COUNT(*) FROM public.orders WHERE status = 'completed') as total_transactions,
  (SELECT COUNT(*) FROM public.withdrawal_requests WHERE status = 'pendente') as pending_withdrawals,
  (SELECT COALESCE(SUM(amount::numeric), 0) FROM public.withdrawal_requests WHERE status = 'aprovado') as total_paid_out;

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para admin_users (apenas admins podem ver)
CREATE POLICY "Admin users can view admin users" 
ON public.admin_users 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.admin_users WHERE email = get_current_user_email() AND is_active = true));

-- Políticas RLS para admin_logs (apenas admins podem ver e inserir)
CREATE POLICY "Admin users can view admin logs" 
ON public.admin_logs 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.admin_users WHERE email = get_current_user_email() AND is_active = true));

CREATE POLICY "Admin users can insert admin logs" 
ON public.admin_logs 
FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE email = get_current_user_email() AND is_active = true));

-- Função para verificar se um email é de administrador
CREATE OR REPLACE FUNCTION public.is_admin_user(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users 
    WHERE email = user_email 
      AND is_active = true
  );
$$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_admin_users_updated_at
BEFORE UPDATE ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
