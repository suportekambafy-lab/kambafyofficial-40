-- Substituir onesignal_player_id por fcm_token na tabela profiles
ALTER TABLE profiles 
DROP COLUMN IF EXISTS onesignal_player_id;

ALTER TABLE profiles 
ADD COLUMN fcm_token TEXT;

COMMENT ON COLUMN profiles.fcm_token IS 'Firebase Cloud Messaging token para push notifications';