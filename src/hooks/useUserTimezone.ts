import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { useGeoLocation } from './useGeoLocation';

// Mapeamento de país para fuso horário padrão
export const COUNTRY_TIMEZONES: Record<string, string> = {
  'AO': 'Africa/Luanda',      // Angola (UTC+1)
  'PT': 'Europe/Lisbon',      // Portugal (UTC+0/+1)
  'MZ': 'Africa/Maputo',      // Moçambique (UTC+2)
  'GB': 'Europe/London',      // Reino Unido (UTC+0/+1)
  'US': 'America/New_York',   // EUA - Nova York (UTC-5/-4)
  'BR': 'America/Sao_Paulo',  // Brasil - São Paulo (UTC-3)
  'ES': 'Europe/Madrid',      // Espanha (UTC+1/+2)
  'FR': 'Europe/Paris',       // França (UTC+1/+2)
  'DE': 'Europe/Berlin',      // Alemanha (UTC+1/+2)
  'CV': 'Atlantic/Cape_Verde', // Cabo Verde (UTC-1)
  'ST': 'Africa/Sao_Tome',    // São Tomé e Príncipe (UTC+0)
  'GW': 'Africa/Bissau',      // Guiné-Bissau (UTC+0)
};

// Lista completa de fusos horários disponíveis para seleção
export const AVAILABLE_TIMEZONES = [
  { value: 'Africa/Luanda', label: 'Angola (Luanda)', flag: '🇦🇴', offset: 'UTC+1' },
  { value: 'Europe/Lisbon', label: 'Portugal (Lisboa)', flag: '🇵🇹', offset: 'UTC+0/+1' },
  { value: 'Africa/Maputo', label: 'Moçambique (Maputo)', flag: '🇲🇿', offset: 'UTC+2' },
  { value: 'America/Sao_Paulo', label: 'Brasil (São Paulo)', flag: '🇧🇷', offset: 'UTC-3' },
  { value: 'Europe/London', label: 'Reino Unido (Londres)', flag: '🇬🇧', offset: 'UTC+0/+1' },
  { value: 'America/New_York', label: 'EUA (Nova York)', flag: '🇺🇸', offset: 'UTC-5/-4' },
  { value: 'America/Los_Angeles', label: 'EUA (Los Angeles)', flag: '🇺🇸', offset: 'UTC-8/-7' },
  { value: 'Europe/Madrid', label: 'Espanha (Madrid)', flag: '🇪🇸', offset: 'UTC+1/+2' },
  { value: 'Europe/Paris', label: 'França (Paris)', flag: '🇫🇷', offset: 'UTC+1/+2' },
  { value: 'Atlantic/Cape_Verde', label: 'Cabo Verde', flag: '🇨🇻', offset: 'UTC-1' },
  { value: 'Africa/Sao_Tome', label: 'São Tomé e Príncipe', flag: '🇸🇹', offset: 'UTC+0' },
  { value: 'Africa/Bissau', label: 'Guiné-Bissau', flag: '🇬🇼', offset: 'UTC+0' },
];

interface UseUserTimezoneReturn {
  timezone: string;
  detectedTimezone: string;
  isAutomatic: boolean;
  loading: boolean;
  setTimezone: (tz: string | null) => Promise<void>;
  formatInTimezone: (date: Date | string, formatStr?: string) => string;
  getHourInTimezone: (date: Date | string) => number;
  getDayInTimezone: (date: Date | string) => number;
  getCurrentTimePreview: () => string;
}

export const useUserTimezone = (): UseUserTimezoneReturn => {
  const { user } = useAuth();
  const { userCountry } = useGeoLocation();
  const [profileTimezone, setProfileTimezone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fuso horário detectado pelo país
  const detectedTimezone = COUNTRY_TIMEZONES[userCountry?.code || 'AO'] || 'Africa/Luanda';

  // Fuso horário efetivo (perfil > detectado)
  const timezone = profileTimezone || detectedTimezone;

  // Verificar se está usando detecção automática
  const isAutomatic = !profileTimezone;

  // Carregar timezone do perfil
  useEffect(() => {
    const loadProfileTimezone = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('timezone')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading profile timezone:', error);
        } else if (data && (data as any).timezone) {
          setProfileTimezone((data as any).timezone);
        }
      } catch (error) {
        console.error('Error loading timezone:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfileTimezone();
  }, [user]);

  // Salvar timezone no perfil
  const setTimezone = useCallback(async (tz: string | null) => {
    if (!user) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('profiles')
        .update({ timezone: tz })
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      setProfileTimezone(tz);
    } catch (error) {
      console.error('Error saving timezone:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Formatar data no fuso horário do usuário
  const formatInTimezone = useCallback((date: Date | string, formatStr: string = 'dd/MM/yyyy HH:mm') => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      const zonedDate = toZonedTime(dateObj, timezone);
      return formatTz(zonedDate, formatStr, { timeZone: timezone });
    } catch (error) {
      console.error('Error formatting date in timezone:', error);
      return typeof date === 'string' ? date : date.toISOString();
    }
  }, [timezone]);

  // Obter hora no fuso horário do usuário
  const getHourInTimezone = useCallback((date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      const zonedDate = toZonedTime(dateObj, timezone);
      return zonedDate.getHours();
    } catch (error) {
      console.error('Error getting hour in timezone:', error);
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.getHours();
    }
  }, [timezone]);

  // Obter dia da semana no fuso horário do usuário
  const getDayInTimezone = useCallback((date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      const zonedDate = toZonedTime(dateObj, timezone);
      return zonedDate.getDay();
    } catch (error) {
      console.error('Error getting day in timezone:', error);
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.getDay();
    }
  }, [timezone]);

  // Preview da hora atual no fuso selecionado
  const getCurrentTimePreview = useCallback(() => {
    try {
      const now = new Date();
      const zonedDate = toZonedTime(now, timezone);
      return formatTz(zonedDate, 'HH:mm:ss', { timeZone: timezone });
    } catch (error) {
      return new Date().toLocaleTimeString();
    }
  }, [timezone]);

  return {
    timezone,
    detectedTimezone,
    isAutomatic,
    loading,
    setTimezone,
    formatInTimezone,
    getHourInTimezone,
    getDayInTimezone,
    getCurrentTimePreview,
  };
};
