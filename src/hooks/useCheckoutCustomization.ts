
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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

// Helper function to safely merge settings
const mergeSettings = (loadedData: any): CheckoutCustomizationSettings => {
  if (!loadedData || typeof loadedData !== 'object' || Array.isArray(loadedData)) {
    return defaultSettings;
  }
  
  // Deep merge with validation
  const result = { ...defaultSettings };
  
  if (loadedData.banner && typeof loadedData.banner === 'object') {
    result.banner = { ...defaultSettings.banner, ...loadedData.banner };
  }
  
  if (loadedData.countdown && typeof loadedData.countdown === 'object') {
    result.countdown = {
      ...defaultSettings.countdown,
      ...loadedData.countdown,
      backgroundColor: normalizeColor(loadedData.countdown.backgroundColor || defaultSettings.countdown.backgroundColor),
      textColor: normalizeColor(loadedData.countdown.textColor || defaultSettings.countdown.textColor)
    };
  }
  
  if (loadedData.reviews && typeof loadedData.reviews === 'object') {
    result.reviews = { ...defaultSettings.reviews, ...loadedData.reviews };
  }
  
  if (loadedData.socialProof && typeof loadedData.socialProof === 'object') {
    result.socialProof = { ...defaultSettings.socialProof, ...loadedData.socialProof };
  }
  
  if (loadedData.spotsCounter && typeof loadedData.spotsCounter === 'object') {
    result.spotsCounter = {
      ...defaultSettings.spotsCounter,
      ...loadedData.spotsCounter,
      backgroundColor: normalizeColor(loadedData.spotsCounter.backgroundColor || defaultSettings.spotsCounter.backgroundColor),
      textColor: normalizeColor(loadedData.spotsCounter.textColor || defaultSettings.spotsCounter.textColor)
    };
  }
  
  return result;
};

export function useCheckoutCustomization(productId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<CheckoutCustomizationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    console.log('🎯 useCheckoutCustomization - Estado do usuário:', user ? '✅ Logado' : '❌ Não logado');
    console.log('📦 Product ID:', productId);
    if (user && productId) {
      loadSettings();
    }
  }, [user, productId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      console.log('🔄 LOAD: Iniciando carregamento de configurações');
      console.log('🔄 LOAD: User ID:', user?.id);
      console.log('🔄 LOAD: Product ID:', productId);
      
      const { data, error } = await supabase
        .from('checkout_customizations')
        .select('settings')
        .eq('user_id', user?.id)
        .eq('product_id', productId)
        .maybeSingle();

      console.log('🔄 LOAD: Resposta do banco:', { data, error });

      if (error) {
        console.error('❌ LOAD: Erro ao carregar:', error);
      } else if (data?.settings) {
        console.log('📦 LOAD: Settings carregados do banco:', data.settings);
        const settingsData = data.settings as any;
        console.log('📊 LOAD: SpotsCounter no banco:', settingsData.spotsCounter);
        
        const mergedSettings = mergeSettings(data.settings);
        console.log('✅ LOAD: Settings após merge:', mergedSettings);
        console.log('✅ LOAD: SpotsCounter após merge:', mergedSettings.spotsCounter);
        
        setSettings(mergedSettings);
      } else {
        console.log('⚠️ LOAD: Nenhum dado encontrado, usando defaults');
      }
    } catch (error) {
      console.error('❌ LOAD: Erro no catch:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: CheckoutCustomizationSettings) => {
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
      
      console.log('💾 SAVE: Iniciando salvamento');
      console.log('💾 SAVE: User ID:', user.id);
      console.log('💾 SAVE: Product ID:', productId);
      console.log('💾 SAVE: Settings a salvar:', newSettings);
      console.log('💾 SAVE: SpotsCounter:', newSettings.spotsCounter);
      
      // Normalize colors before saving
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
      
      console.log('💾 SAVE: Settings normalizadas:', normalizedSettings);
      console.log('💾 SAVE: SpotsCounter normalizado:', normalizedSettings.spotsCounter);
      
      // Convert settings to JSON-compatible format
      const settingsJson = JSON.parse(JSON.stringify(normalizedSettings));
      console.log('💾 SAVE: Settings JSON:', settingsJson);
      console.log('💾 SAVE: SpotsCounter JSON:', settingsJson.spotsCounter);

      // Primeiro tentar atualizar o registro existente
      const { data: updateData, error: updateError } = await supabase
        .from('checkout_customizations')
        .update({ settings: settingsJson })
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .select();

      console.log('💾 SAVE: Resposta do update:', { updateData, updateError });

      // Se não houve erro no update, significa que atualizou com sucesso
      if (!updateError && updateData && updateData.length > 0) {
        console.log('✅ SAVE: Configurações atualizadas com sucesso!');
        const savedData = updateData[0].settings as any;
        console.log('✅ SAVE: Dados salvos:', savedData);
        console.log('✅ SAVE: SpotsCounter salvo:', savedData.spotsCounter);
      } else {
        // Se não encontrou registro para atualizar, criar um novo
        console.log('💾 SAVE: Nenhum registro encontrado, criando novo...');
        const { data: insertData, error: insertError } = await supabase
          .from('checkout_customizations')
          .insert({
            user_id: user.id,
            product_id: productId,
            settings: settingsJson
          })
          .select();

        console.log('💾 SAVE: Resposta do insert:', { insertData, insertError });

        if (insertError) {
          console.error('❌ SAVE: Erro ao inserir:', insertError);
          throw insertError;
        }
        console.log('✅ SAVE: Configurações criadas com sucesso!');
        console.log('✅ SAVE: Dados criados:', insertData?.[0]?.settings);
      }
      
      setSettings(normalizedSettings);
      console.log('✅ SAVE: Estado local atualizado com cores normalizadas');

      toast({
        title: "Configurações salvas!",
        description: "Suas personalizações do checkout foram aplicadas com sucesso.",
      });
    } catch (error) {
      console.error('❌ SAVE: Error saving checkout customization:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    setSettings,
    saveSettings,
    loading,
    saving
  };
}
