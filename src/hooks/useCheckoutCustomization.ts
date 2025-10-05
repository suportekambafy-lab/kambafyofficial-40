
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDebounced } from '@/hooks/useDebounced';

export interface CheckoutCustomizationSettings {
  banner: {
    enabled: boolean;
    bannerImage: string;
  };
  countdown: {
    enabled: boolean;
    minutes: number;
    title: string;
    backgroundColor: string;
    textColor: string;
  };
  reviews: {
    enabled: boolean;
    title: string;
    reviews: Array<{
      id: string;
      name: string;
      rating: number;
      comment: string;
      timeAgo: string;
      verified: boolean;
      avatar: string;
    }>;
  };
  socialProof: {
    enabled: boolean;
    viewersCount: number;
    totalSales: number;
    recentPurchases: string[];
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  };
  spotsCounter: {
    enabled: boolean;
    mode: 'automatic' | 'manual' | 'time-based';
    initialCount: number;
    currentCount: number;
    title: string;
    backgroundColor: string;
    textColor: string;
    decrementInterval?: number; // em segundos para o modo time-based
  };
}

const defaultSettings: CheckoutCustomizationSettings = {
  banner: {
    enabled: false,
    bannerImage: ''
  },
  countdown: {
    enabled: false,
    minutes: 30,
    title: 'Oferta por tempo limitado',
    backgroundColor: '#ef4444',
    textColor: '#ffffff'
  },
  reviews: {
    enabled: false,
    title: '⭐ Avaliações dos Clientes',
    reviews: [
      {
        id: '1',
        name: 'Maria Silva',
        rating: 5,
        comment: 'Excelente produto! Superou minhas expectativas. Recomendo muito!',
        timeAgo: 'há 2 horas',
        verified: true,
        avatar: ''
      },
      {
        id: '2',
        name: 'João Santos',
        rating: 5,
        comment: 'Conteúdo de qualidade excepcional. Valeu cada centavo investido.',
        timeAgo: 'há 4 horas',
        verified: true,
        avatar: ''
      }
    ]
  },
  socialProof: {
    enabled: false,
    viewersCount: 31,
    totalSales: 2847,
    recentPurchases: [
      'Carla Mendes acabou de comprar há 3 min',
      'Ricardo Sousa acabou de comprar há 7 min',
      'Beatriz Ferreira acabou de comprar há 12 min'
    ],
    position: 'bottom-right'
  },
  spotsCounter: {
    enabled: false,
    mode: 'automatic',
    initialCount: 100,
    currentCount: 100,
    title: 'VAGAS RESTANTES',
    backgroundColor: '#6366f1',
    textColor: '#ffffff',
    decrementInterval: 60 // 1 minuto padrão
  }
};

// Development-only logging
const isDev = import.meta.env.DEV;
const debugLog = (message: string, ...args: any[]) => {
  if (isDev) console.log(message, ...args);
};

// Helper function to convert color names to hex
const normalizeColor = (color: string): string => {
  const colorMap: { [key: string]: string } = {
    'white': '#ffffff',
    'black': '#000000',
    'red': '#ff0000',
    'blue': '#0000ff',
    'green': '#00ff00',
    'yellow': '#ffff00',
    'purple': '#800080',
    'orange': '#ffa500',
    'pink': '#ffc0cb',
    'gray': '#808080',
    'grey': '#808080'
  };
  
  const lowerColor = color.toLowerCase().trim();
  return colorMap[lowerColor] || (color.startsWith('#') ? color : '#ffffff');
};

// Cache key for localStorage
const getCacheKey = (userId: string, productId: string) => 
  `checkout_custom_${userId}_${productId}`;

// Optimized merge settings with spread operators
const mergeSettings = (loadedData: any): CheckoutCustomizationSettings => {
  if (!loadedData || typeof loadedData !== 'object' || Array.isArray(loadedData)) {
    return defaultSettings;
  }
  
  return {
    banner: { ...defaultSettings.banner, ...(loadedData.banner || {}) },
    countdown: {
      ...defaultSettings.countdown,
      ...(loadedData.countdown || {}),
      backgroundColor: normalizeColor(loadedData.countdown?.backgroundColor || defaultSettings.countdown.backgroundColor),
      textColor: normalizeColor(loadedData.countdown?.textColor || defaultSettings.countdown.textColor)
    },
    reviews: { ...defaultSettings.reviews, ...(loadedData.reviews || {}) },
    socialProof: { ...defaultSettings.socialProof, ...(loadedData.socialProof || {}) },
    spotsCounter: {
      ...defaultSettings.spotsCounter,
      ...(loadedData.spotsCounter || {}),
      backgroundColor: normalizeColor(loadedData.spotsCounter?.backgroundColor || defaultSettings.spotsCounter.backgroundColor),
      textColor: normalizeColor(loadedData.spotsCounter?.textColor || defaultSettings.spotsCounter.textColor)
    }
  };
};

export function useCheckoutCustomization(productId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<CheckoutCustomizationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    debugLog('🎯 useCheckoutCustomization - User:', user ? 'Logged' : 'Not logged');
    if (user && productId) {
      loadSettings();
    }
  }, [user, productId]);

  const loadSettings = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Check cache first
      const cacheKey = getCacheKey(user.id, productId);
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          const mergedSettings = mergeSettings(parsed);
          setSettings(mergedSettings);
          debugLog('✅ Loaded from cache');
          setLoading(false);
          return;
        } catch (e) {
          debugLog('⚠️ Invalid cache, loading from DB');
        }
      }
      
      const { data, error } = await supabase
        .from('checkout_customizations')
        .select('settings')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (error) {
        debugLog('❌ Error loading settings:', error);
      } else if (data?.settings) {
        const mergedSettings = mergeSettings(data.settings);
        setSettings(mergedSettings);
        
        // Update cache
        localStorage.setItem(cacheKey, JSON.stringify(data.settings));
        debugLog('✅ Settings loaded and cached');
      } else {
        debugLog('⚠️ No settings found, using defaults');
      }
    } catch (error) {
      debugLog('❌ Error:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, productId]);

  const saveSettingsInternal = useCallback(async (newSettings: CheckoutCustomizationSettings) => {
    if (!user || !productId) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para salvar as configurações.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      
      // Normalize colors
      const normalizedSettings = {
        ...newSettings,
        countdown: {
          ...newSettings.countdown,
          backgroundColor: normalizeColor(newSettings.countdown.backgroundColor),
          textColor: normalizeColor(newSettings.countdown.textColor)
        },
        spotsCounter: {
          ...newSettings.spotsCounter,
          backgroundColor: normalizeColor(newSettings.spotsCounter.backgroundColor),
          textColor: normalizeColor(newSettings.spotsCounter.textColor)
        }
      };
      
      // Use UPSERT for single operation (faster)
      const { error } = await supabase
        .from('checkout_customizations')
        .upsert({
          user_id: user.id,
          product_id: productId,
          settings: normalizedSettings
        }, {
          onConflict: 'user_id,product_id'
        });

      if (error) {
        debugLog('❌ Error saving:', error);
        throw error;
      }
      
      setSettings(normalizedSettings);
      
      // Update cache
      const cacheKey = getCacheKey(user.id, productId);
      localStorage.setItem(cacheKey, JSON.stringify(normalizedSettings));
      
      debugLog('✅ Settings saved successfully');

      toast({
        title: "Configurações salvas!",
        description: "Suas personalizações do checkout foram aplicadas com sucesso.",
      });
    } catch (error) {
      debugLog('❌ Error saving:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }, [user, productId, toast]);

  // Debounced save function (300ms delay)
  const { debouncedFunc: saveSettings } = useDebounced(saveSettingsInternal, 300);

  return {
    settings,
    setSettings,
    saveSettings,
    loading,
    saving
  };
}
