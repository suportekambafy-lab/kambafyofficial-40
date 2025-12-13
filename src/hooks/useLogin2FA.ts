import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface DeviceInfo {
  fingerprint: string;
  ipAddress: string;
  location: string;
  browser: string;
  os: string;
  isMobile: boolean;
}

interface Login2FAResult {
  requires2FA: boolean;
  reason: 'new_device' | 'new_browser' | 'long_inactivity' | 'suspicious_ip' | null;
  userEmail: string;
  userId: string;
}

// Gerar fingerprint do dispositivo
const generateFingerprint = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
  }
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL()
  ].join('|');
  
  return btoa(fingerprint).slice(0, 32);
};

// Detectar informações do dispositivo
const detectDevice = (): Omit<DeviceInfo, 'ipAddress' | 'location'> => {
  const userAgent = navigator.userAgent;
  const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
  
  let browser = 'Unknown';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  
  let os = 'Unknown';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';
  
  return { fingerprint: generateFingerprint(), browser, os, isMobile };
};

// Obter IP e localização
const getIPAndLocation = async (): Promise<{ ipAddress: string; location: string }> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('https://ipapi.co/json/', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    const data = await response.json();
    return {
      ipAddress: data.ip || 'Unknown',
      location: `${data.city || 'Unknown'}, ${data.country_name || 'Unknown'}`
    };
  } catch {
    return { ipAddress: 'Unknown', location: 'Unknown' };
  }
};

// Constantes de tempo
const INACTIVITY_THRESHOLD_DAYS = 30; // Dias sem login para considerar inatividade longa

export const useLogin2FA = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // Carregar informações do dispositivo
  useEffect(() => {
    const loadDeviceInfo = async () => {
      const device = detectDevice();
      const { ipAddress, location } = await getIPAndLocation();
      setDeviceInfo({ ...device, ipAddress, location });
    };
    loadDeviceInfo();
  }, []);

  // Verificar se precisa de 2FA após login bem-sucedido
  const checkLogin2FARequired = useCallback(async (user: User): Promise<Login2FAResult> => {
    const defaultResult: Login2FAResult = {
      requires2FA: false,
      reason: null,
      userEmail: user.email || '',
      userId: user.id
    };

    if (!deviceInfo) {
      return defaultResult;
    }

    try {
      setLoading(true);

      // 1. Verificar se o usuário tem 2FA ativado
      const { data: settings } = await supabase
        .from('user_2fa_settings')
        .select('enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      // Se 2FA não está ativado, não exigir
      if (!settings?.enabled) {
        console.log('ℹ️ 2FA não ativado para este usuário');
        return defaultResult;
      }

      // 2. Verificar se é dispositivo confiável
      const { data: trustedDevice } = await supabase
        .from('trusted_devices')
        .select('id, last_used, expires_at')
        .eq('user_id', user.id)
        .eq('device_fingerprint', deviceInfo.fingerprint)
        .maybeSingle();

      if (trustedDevice) {
        // Verificar se o dispositivo ainda é válido (90 dias)
        const expiresAt = new Date(trustedDevice.expires_at);
        if (expiresAt > new Date()) {
          console.log('✅ Dispositivo confiável encontrado - 2FA não necessário');
          
          // Atualizar last_used
          await supabase
            .from('trusted_devices')
            .update({ last_used: new Date().toISOString() })
            .eq('id', trustedDevice.id);
          
          // Também garantir que o dispositivo está registrado em user_devices
          const { data: existingUserDevice } = await supabase
            .from('user_devices')
            .select('id')
            .eq('user_id', user.id)
            .eq('device_fingerprint', deviceInfo.fingerprint)
            .maybeSingle();
            
          if (!existingUserDevice) {
            await supabase
              .from('user_devices')
              .insert({
                user_id: user.id,
                device_fingerprint: deviceInfo.fingerprint,
                device_info: {
                  isMobile: deviceInfo.isMobile,
                  browser: deviceInfo.browser,
                  os: deviceInfo.os,
                  ipAddress: deviceInfo.ipAddress,
                  location: deviceInfo.location
                }
              });
          }
          
          return defaultResult;
        } else {
          console.log('⚠️ Dispositivo confiável expirou após 90 dias');
        }
      }

      // 3. Verificar histórico de dispositivos do usuário
      const { data: userDevices } = await supabase
        .from('user_devices')
        .select('device_fingerprint, device_info, last_seen_at')
        .eq('user_id', user.id);

      const knownDevice = userDevices?.find(d => d.device_fingerprint === deviceInfo.fingerprint);
      
      // Se é um dispositivo conhecido, verificar se precisa de 2FA por outros motivos
      if (knownDevice) {
        console.log('✅ Dispositivo conhecido encontrado');
      } else {
        // Novo dispositivo detectado - exigir 2FA
        console.log('🔔 Novo dispositivo detectado - 2FA necessário');
        return {
          requires2FA: true,
          reason: 'new_device',
          userEmail: user.email || '',
          userId: user.id
        };
      }

      // 4. Verificar se o navegador mudou (mesmo dispositivo, navegador diferente)
      const storedDeviceInfo = knownDevice.device_info as { browser?: string; os?: string; isMobile?: boolean } | null;
      if (storedDeviceInfo?.browser && storedDeviceInfo.browser !== deviceInfo.browser) {
        console.log('🔔 Novo navegador detectado - 2FA necessário');
        return {
          requires2FA: true,
          reason: 'new_browser',
          userEmail: user.email || '',
          userId: user.id
        };
      }

      // 5. Verificar tempo desde último login
      if (knownDevice.last_seen_at) {
        const lastSeen = new Date(knownDevice.last_seen_at);
        const daysSinceLastLogin = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceLastLogin > INACTIVITY_THRESHOLD_DAYS) {
          console.log(`🔔 Inatividade longa (${Math.floor(daysSinceLastLogin)} dias) - 2FA necessário`);
          return {
            requires2FA: true,
            reason: 'long_inactivity',
            userEmail: user.email || '',
            userId: user.id
          };
        }
      }

      // 6. Verificar se IP é suspeito (diferente dos últimos IPs usados)
      const { data: recentEvents } = await supabase
        .from('security_events')
        .select('ip_address')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .limit(20);

      if (recentEvents && recentEvents.length > 0) {
        const knownIPs = new Set(recentEvents.map(e => e.ip_address).filter(Boolean));
        if (!knownIPs.has(deviceInfo.ipAddress) && knownIPs.size >= 3) {
          console.log('🔔 IP suspeito detectado - 2FA necessário');
          return {
            requires2FA: true,
            reason: 'suspicious_ip',
            userEmail: user.email || '',
            userId: user.id
          };
        }
      }

      console.log('✅ Nenhuma verificação adicional necessária');
      return defaultResult;

    } catch (error) {
      console.error('Erro ao verificar necessidade de 2FA:', error);
      // Em caso de erro, não bloquear o usuário
      return defaultResult;
    } finally {
      setLoading(false);
    }
  }, [deviceInfo]);

  // Registrar dispositivo e login bem-sucedido
  const registerSuccessfulLogin = useCallback(async (userId: string, trustDevice: boolean = false) => {
    if (!deviceInfo) return;

    try {
      // Atualizar ou criar registro de dispositivo
      const { data: existingDevice } = await supabase
        .from('user_devices')
        .select('id')
        .eq('user_id', userId)
        .eq('device_fingerprint', deviceInfo.fingerprint)
        .maybeSingle();

      if (existingDevice) {
        await supabase
          .from('user_devices')
          .update({
            last_seen_at: new Date().toISOString(),
            device_info: {
              isMobile: deviceInfo.isMobile,
              browser: deviceInfo.browser,
              os: deviceInfo.os,
              ipAddress: deviceInfo.ipAddress,
              location: deviceInfo.location
            }
          })
          .eq('id', existingDevice.id);
      } else {
        await supabase
          .from('user_devices')
          .insert({
            user_id: userId,
            device_fingerprint: deviceInfo.fingerprint,
            device_info: {
              isMobile: deviceInfo.isMobile,
              browser: deviceInfo.browser,
              os: deviceInfo.os,
              ipAddress: deviceInfo.ipAddress,
              location: deviceInfo.location
            }
          });
      }

      // Se deve confiar no dispositivo
      if (trustDevice) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 90);

        await supabase
          .from('trusted_devices')
          .upsert({
            user_id: userId,
            device_fingerprint: deviceInfo.fingerprint,
            device_name: `${deviceInfo.browser} em ${deviceInfo.os}`,
            ip_address: deviceInfo.ipAddress,
            location: deviceInfo.location,
            expires_at: expiresAt.toISOString(),
            last_used: new Date().toISOString()
          }, {
            onConflict: 'user_id,device_fingerprint'
          });
      }

      // Registrar evento de segurança
      await supabase
        .from('security_events')
        .insert({
          user_id: userId,
          event_type: 'login',
          ip_address: deviceInfo.ipAddress,
          device_fingerprint: deviceInfo.fingerprint,
          location: deviceInfo.location,
          requires_2fa: false,
          verified_at: new Date().toISOString()
        });

    } catch (error) {
      console.error('Erro ao registrar login:', error);
    }
  }, [deviceInfo]);

  return {
    deviceInfo,
    loading,
    checkLogin2FARequired,
    registerSuccessfulLogin
  };
};
