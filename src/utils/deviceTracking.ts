import { supabase } from '@/integrations/supabase/client';

interface DeviceInfo {
  fingerprint: string;
  ipAddress: string;
  location: string;
  isMobile: boolean;
  browser: string;
  os: string;
}

export const checkAndSaveDevice = async (
  userId: string,
  deviceInfo: DeviceInfo
): Promise<boolean> => {
  try {
    // Verificar se o dispositivo já existe
    const { data: existingDevice, error: checkError } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', userId)
      .eq('device_fingerprint', deviceInfo.fingerprint)
      .maybeSingle();

    if (checkError) {
      console.error('Erro ao verificar dispositivo:', checkError);
      return false;
    }

    if (existingDevice) {
      // Dispositivo conhecido - atualizar last_seen_at
      const { error: updateError } = await supabase
        .from('user_devices')
        .update({
          last_seen_at: new Date().toISOString(),
          device_info: deviceInfo as any,
        })
        .eq('id', existingDevice.id);

      if (updateError) {
        console.error('Erro ao atualizar dispositivo:', updateError);
      }

      return true; // Dispositivo conhecido
    } else {
      // Novo dispositivo - criar registro
      const { error: insertError } = await supabase
        .from('user_devices')
        .insert([{
          user_id: userId,
          device_fingerprint: deviceInfo.fingerprint,
          device_info: deviceInfo as any,
        }]);

      if (insertError) {
        console.error('Erro ao salvar novo dispositivo:', insertError);
      }

      return false; // Dispositivo novo
    }
  } catch (error) {
    console.error('Erro ao processar dispositivo:', error);
    return false;
  }
};

