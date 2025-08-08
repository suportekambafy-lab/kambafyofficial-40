-- Adicionar coluna para preferência de notificações push
ALTER TABLE public.profiles 
ADD COLUMN push_notifications_enabled BOOLEAN DEFAULT false;