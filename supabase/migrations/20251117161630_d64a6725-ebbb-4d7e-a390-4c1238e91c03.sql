-- Criar tabela para logs de sincronização do OneSignal
CREATE TABLE IF NOT EXISTS public.onesignal_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id TEXT,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_onesignal_sync_logs_user_id ON public.onesignal_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_onesignal_sync_logs_created_at ON public.onesignal_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_onesignal_sync_logs_status ON public.onesignal_sync_logs(status);

-- RLS policies
ALTER TABLE public.onesignal_sync_logs ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todos os logs
CREATE POLICY "Admins can view all onesignal sync logs"
  ON public.onesignal_sync_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND is_active = true
    )
  );

-- Usuários podem ver seus próprios logs
CREATE POLICY "Users can view their own onesignal sync logs"
  ON public.onesignal_sync_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Sistema pode inserir logs
CREATE POLICY "System can insert onesignal sync logs"
  ON public.onesignal_sync_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);