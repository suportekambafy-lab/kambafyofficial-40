-- Criar tabela de notificações para vendedores
CREATE TABLE IF NOT EXISTS public.seller_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('payment_approved', 'new_sale', 'withdrawal_processed', 'general')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  order_id TEXT,
  amount NUMERIC,
  currency TEXT DEFAULT 'KZ',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_seller_notifications_user_id ON public.seller_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_notifications_created_at ON public.seller_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seller_notifications_read ON public.seller_notifications(read);

-- RLS policies
ALTER TABLE public.seller_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.seller_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.seller_notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.seller_notifications
  FOR INSERT WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_seller_notifications_updated_at
  BEFORE UPDATE ON public.seller_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();