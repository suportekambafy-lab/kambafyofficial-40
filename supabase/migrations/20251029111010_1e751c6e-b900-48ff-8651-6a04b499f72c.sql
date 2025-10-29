-- Adicionar coluna para armazenar o Player ID do OneSignal
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onesignal_player_id TEXT;

-- Criar índice para otimizar buscas por player_id
CREATE INDEX IF NOT EXISTS idx_profiles_onesignal 
ON public.profiles(onesignal_player_id);

-- Comentário explicativo
COMMENT ON COLUMN public.profiles.onesignal_player_id IS 'Player ID do OneSignal para envio de notificações push';