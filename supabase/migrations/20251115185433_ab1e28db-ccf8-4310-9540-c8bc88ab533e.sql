-- Reverter mudanças do FCM e manter onesignal_player_id
ALTER TABLE profiles 
DROP COLUMN IF EXISTS fcm_token;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onesignal_player_id TEXT;

COMMENT ON COLUMN profiles.onesignal_player_id IS 'OneSignal player ID for push notifications (opcional, sistema usa notificações internas via Realtime)';