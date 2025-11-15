-- Habilitar Realtime na tabela seller_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.seller_notifications;

-- Garantir que há uma política SELECT para o usuário ver suas próprias notificações
-- (necessário para o Realtime funcionar)
DO $$ 
BEGIN
  -- Remover política antiga se existir
  DROP POLICY IF EXISTS "Users can view their own notifications" ON public.seller_notifications;
  
  -- Criar nova política SELECT
  CREATE POLICY "Users can view their own notifications"
    ON public.seller_notifications
    FOR SELECT
    USING (auth.uid() = user_id);
END $$;