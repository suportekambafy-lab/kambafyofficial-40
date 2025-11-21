
import { useState, useEffect } from 'react';

interface DeviceContext {
  fingerprint: string;
  ipAddress: string;
  location: string;
  isMobile: boolean;
  browser: string;
  os: string;
}

export const useDeviceContext = () => {
  const [context, setContext] = useState<DeviceContext | null>(null);
  const [loading, setLoading] = useState(true);

  const generateFingerprint = () => {
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

  const detectDevice = () => {
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
    
    return { isMobile, browser, os };
  };

  const getIPAndLocation = async () => {
    try {
      // Adicionar timeout de 3 segundos
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
    } catch (error) {
      console.log('Could not fetch IP/location (timeout or error):', error);
      return {
        ipAddress: 'Unknown',
        location: 'Unknown'
      };
    }
  };

  useEffect(() => {
    const loadContext = async () => {
      try {
        const { isMobile, browser, os } = detectDevice();
        const { ipAddress, location } = await getIPAndLocation();
        const fingerprint = generateFingerprint();

        setContext({
          fingerprint,
          ipAddress,
          location,
          isMobile,
          browser,
          os
        });
      } catch (error) {
        console.error('Error loading device context:', error);
        // Mesmo com erro, cria um contexto com valores default
        const { isMobile, browser, os } = detectDevice();
        setContext({
          fingerprint: generateFingerprint(),
          ipAddress: 'Unknown',
          location: 'Unknown',
          isMobile,
          browser,
          os
        });
      } finally {
        // Garantir que loading sempre termina
        setLoading(false);
      }
    };

    loadContext();
  }, []);

  return { context, loading };
};
