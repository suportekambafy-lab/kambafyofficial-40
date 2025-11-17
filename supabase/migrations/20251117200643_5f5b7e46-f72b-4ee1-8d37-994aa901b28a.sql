-- Adicionar coluna onesignal_player_id na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onesignal_player_id TEXT;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_profiles_onesignal_player_id 
ON public.profiles(onesignal_player_id);