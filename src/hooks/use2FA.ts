import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDeviceContext } from './useDeviceContext';

interface User2FASettings {
  id: string;
  user_id: string;
  enabled: boolean;
  method: 'email' | 'sms' | 'whatsapp' | 'authenticator';
  phone_number?: string;
  backup_codes?: string[];
}

interface SecurityEvent {
  id: string;
  user_id: string;
  event_type: 'login' | 'password_change' | 'bank_details_change' | 'withdrawal' | 'suspicious_ip';
  ip_address?: string;
  location?: string;
  device_fingerprint?: string;
  requires_2fa: boolean;
  verified_at?: string;
  created_at: string;
}

export const use2FA = () => {
  const { user } = useAuth();
  const { context: deviceContext } = useDeviceContext();
  const { toast } = useToast();
  const [settings, setSettings] = useState<User2FASettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);

  // Carregar configurações 2FA do usuário
  const loadSettings = useCallback(async () => {
    if (!user) {
      setSettings(null);
      return;
    }

    try {
      
      const { data, error } = await supabase
        .from('user_2fa_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const typedSettings = {
          ...data,
          method: data.method as 'email' | 'sms' | 'whatsapp' | 'authenticator'
        };
        setSettings(typedSettings);
      } else {
        setSettings(null);
      }
    } catch (error) {
      console.error('Error loading 2FA settings:', error);
      setSettings(null);
    }
  }, [user]);

  // Ativar 2FA
  const enable2FA = async (method: 'email' | 'sms' | 'whatsapp' | 'authenticator', phoneNumber?: string) => {
    if (!user) {
      return false;
    }

    try {
      setLoading(true);

      const settingsData = {
        user_id: user.id,
        enabled: true,
        method,
        phone_number: phoneNumber || null,
      };

      const { data, error } = await supabase
        .from('user_2fa_settings')
        .upsert(settingsData, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setSettings({
        ...data,
        method: data.method as 'email' | 'sms' | 'whatsapp' | 'authenticator'
      });
      
      toast({
        title: "2FA Ativado",
        description: `Autenticação de dois fatores ativada via ${method}`,
      });

      return true;
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      toast({
        title: "Erro",
        description: "Não foi possível ativar o 2FA",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Desativar 2FA
  const disable2FA = async () => {
    if (!user) return false;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('user_2fa_settings')
        .update({ enabled: false })
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, enabled: false } : null);
      
      toast({
        title: "2FA Desativado",
        description: "Autenticação de dois fatores foi desativada",
      });

      return true;
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      toast({
        title: "Erro",
        description: "Não foi possível desativar o 2FA",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Verificar se é dispositivo confiável
  const isTrustedDevice = async (): Promise<boolean> => {
    if (!user || !deviceContext) return false;

    try {
      const { data } = await supabase.rpc('is_trusted_device', {
        _user_id: user.id,
        _device_fingerprint: deviceContext.fingerprint
      });

      return data || false;
    } catch (error) {
      console.error('Error checking trusted device:', error);
      return false;
    }
  };

  // Verificar se IP é suspeito
  const isSuspiciousIP = async (): Promise<boolean> => {
    if (!user || !deviceContext) return false;

    try {
      const { data: recentEvents } = await supabase
        .from('security_events')
        .select('ip_address, location')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .limit(50);

      if (!recentEvents || recentEvents.length === 0) {
        return false;
      }

      const ipUsedRecently = recentEvents.some(event => event.ip_address === deviceContext.ipAddress);
      
      if (ipUsedRecently) {
        return false;
      }

      const currentLocation = deviceContext.location.toLowerCase();
      const locationsSimilar = recentEvents.some(event => {
        if (!event.location) return false;
        const eventLocation = event.location.toLowerCase();
        return currentLocation.includes(eventLocation.split(',').pop()?.trim() || '') ||
               eventLocation.includes(currentLocation.split(',').pop()?.trim() || '');
      });

      return !locationsSimilar;
    } catch (error) {
      console.error('Error checking suspicious IP:', error);
      return false;
    }
  };

  // Lógica principal para verificar se precisa de 2FA
  const requires2FA = async (eventType: SecurityEvent['event_type']): Promise<boolean> => {
    // Se 2FA não está ativado, nunca solicitar
    if (!settings?.enabled) {
      return false;
    }

    if (!user || !deviceContext) {
      return false;
    }

    try {
      // Para alterações críticas (dados bancários, saques), SEMPRE pedir 2FA se estiver ativado
      const criticalActions = ['bank_details_change', 'withdrawal'];
      if (criticalActions.includes(eventType)) {
        return true;
      }

      // Para login, verificar contexto
      if (eventType === 'login') {
        const isDeviceTrusted = await isTrustedDevice();
        const isIPSuspicious = await isSuspiciousIP();

        if (isDeviceTrusted && !isIPSuspicious) {
          return false;
        }

        return true;
      }

      // Para mudança de senha, sempre pedir se 2FA estiver ativo
      if (eventType === 'password_change') {
        return true;
      }

      return false;

    } catch (error) {
      console.error('Error checking 2FA requirement:', error);
      // Em caso de erro, não exigir 2FA para não bloquear o usuário
      return false;
    }
  };

  // Registrar evento de segurança
  const logSecurityEvent = async (
    eventType: SecurityEvent['event_type'], 
    requiresAuth: boolean
  ) => {
    if (!user || !deviceContext) return;

    try {
      const { error } = await supabase
        .from('security_events')
        .insert({
          user_id: user.id,
          event_type: eventType,
          requires_2fa: requiresAuth,
          ip_address: deviceContext.ipAddress,
          device_fingerprint: deviceContext.fingerprint,
          location: deviceContext.location,
        });

      if (error) throw error;
      
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  };

  // Marcar dispositivo como confiável
  const trustDevice = async (deviceName?: string): Promise<boolean> => {
    if (!user || !deviceContext) return false;

    try {
      const autoDeviceName = deviceName || `${deviceContext.browser} em ${deviceContext.os}`;
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);
      
      const { error } = await supabase
        .from('trusted_devices')
        .upsert({
          user_id: user.id,
          device_fingerprint: deviceContext.fingerprint,
          device_name: autoDeviceName,
          ip_address: deviceContext.ipAddress,
          location: deviceContext.location,
          expires_at: expiresAt.toISOString(),
          last_used: new Date().toISOString()
        }, {
          onConflict: 'user_id,device_fingerprint'
        });

      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error trusting device:', error);
      return false;
    }
  };

  // Carregar eventos de segurança
  const loadSecurityEvents = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      if (data) {
        const typedEvents: SecurityEvent[] = data.map(event => ({
          ...event,
          event_type: event.event_type as SecurityEvent['event_type']
        }));
        setSecurityEvents(typedEvents);
      }
    } catch (error) {
      console.error('Error loading security events:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadSettings();
      loadSecurityEvents();
    }
  }, [user, loadSettings]);

  return {
    settings,
    loading,
    securityEvents,
    deviceContext,
    enable2FA,
    disable2FA,
    requires2FA,
    logSecurityEvent,
    trustDevice,
    isTrustedDevice,
    isSuspiciousIP,
    loadSettings,
    loadSecurityEvents,
  };
};
