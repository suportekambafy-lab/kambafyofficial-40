-- Criar tabela para controlar notificações lidas pelos usuários
CREATE TABLE public.read_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_id TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_id)
);

-- Enable RLS
ALTER TABLE public.read_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can manage their own read notifications"
ON public.read_notifications
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Criar tabela para notificações de admin
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_id UUID,
  entity_type TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS para admin notifications
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para admin
CREATE POLICY "Admin users can manage admin notifications"
ON public.admin_notifications
FOR ALL
USING (EXISTS (
  SELECT 1 FROM admin_users 
  WHERE email = get_current_user_email() 
  AND is_active = true
))
WITH CHECK (EXISTS (
  SELECT 1 FROM admin_users 
  WHERE email = get_current_user_email() 
  AND is_active = true
));

-- Trigger para criar notificações automáticas para admin
CREATE OR REPLACE FUNCTION create_admin_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Notificação para novos saques
  IF TG_TABLE_NAME = 'withdrawal_requests' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_notifications (type, title, message, entity_id, entity_type, data)
    VALUES (
      'withdrawal_request',
      'Novo Pedido de Saque',
      'Um vendedor solicitou um saque de ' || NEW.amount || ' KZ',
      NEW.id,
      'withdrawal_request',
      jsonb_build_object('amount', NEW.amount, 'user_id', NEW.user_id)
    );
  END IF;

  -- Notificação para novos pedidos de verificação de identidade
  IF TG_TABLE_NAME = 'identity_verification' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_notifications (type, title, message, entity_id, entity_type, data)
    VALUES (
      'identity_verification',
      'Nova Verificação de Identidade',
      'Um vendedor enviou documentos para verificação de identidade',
      NEW.id,
      'identity_verification',
      jsonb_build_object('user_id', NEW.user_id, 'full_name', NEW.full_name)
    );
  END IF;

  -- Notificação para novos produtos
  IF TG_TABLE_NAME = 'products' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_notifications (type, title, message, entity_id, entity_type, data)
    VALUES (
      'new_product',
      'Novo Produto Adicionado',
      'Um vendedor adicionou o produto: ' || NEW.name,
      NEW.id,
      'product',
      jsonb_build_object('user_id', NEW.user_id, 'product_name', NEW.name)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar triggers
CREATE TRIGGER admin_notification_withdrawal_trigger
  AFTER INSERT ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION create_admin_notification();

CREATE TRIGGER admin_notification_identity_trigger
  AFTER INSERT ON public.identity_verification
  FOR EACH ROW EXECUTE FUNCTION create_admin_notification();

CREATE TRIGGER admin_notification_product_trigger
  AFTER INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION create_admin_notification();

-- Trigger para atualizar updated_at
CREATE TRIGGER update_admin_notifications_updated_at
  BEFORE UPDATE ON public.admin_notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();