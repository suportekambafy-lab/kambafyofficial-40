import { supabase } from '@/integrations/supabase/client';

/**
 * Captura o IP do usuário e atualiza o perfil
 */
export async function captureUserIP(userId: string, type: 'registration' | 'login' = 'login') {
  try {
    // Usar serviço externo para obter IP (ipify é gratuito e confiável)
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    const ip = data.ip;

    if (!ip) {
      console.warn('Could not capture user IP');
      return null;
    }

    // Atualizar perfil com IP
    const updateData = type === 'registration' 
      ? { registration_ip: ip, last_login_ip: ip }
      : { last_login_ip: ip };

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile with IP:', error);
      return null;
    }

    console.log(`✅ IP captured (${type}):`, ip);
    return ip;
  } catch (err) {
    console.error('Error capturing IP:', err);
    return null;
  }
}

/**
 * Captura fingerprint básico do navegador
 */
export function generateBrowserFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
  }
  
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage,
    canvas.toDataURL(),
  ];

  // Simple hash
  let hash = 0;
  const str = components.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Captura IP e fingerprint completo
 */
export async function captureFullTrackingData(userId: string, isNewUser: boolean = false) {
  try {
    const [ipResponse] = await Promise.all([
      fetch('https://api.ipify.org?format=json'),
    ]);
    
    const ipData = await ipResponse.json();
    const ip = ipData.ip;
    const fingerprint = generateBrowserFingerprint();

    const updateData: Record<string, string> = {
      last_login_ip: ip,
    };

    if (isNewUser) {
      updateData.registration_ip = ip;
      updateData.registration_fingerprint = fingerprint;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      console.error('Error updating tracking data:', error);
    }

    return { ip, fingerprint };
  } catch (err) {
    console.error('Error capturing tracking data:', err);
    return null;
  }
}
