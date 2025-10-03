
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
    mode: 'automatic' | 'manual';
    initialCount: number;
    currentCount: number;
    title: string;
    backgroundColor: string;
    textColor: string;
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
    textColor: 'white'
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
    textColor: 'white'
  }
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
    result.countdown = { ...defaultSettings.countdown, ...loadedData.countdown };
  }
  
  if (loadedData.reviews && typeof loadedData.reviews === 'object') {
    result.reviews = { ...defaultSettings.reviews, ...loadedData.reviews };
  }
  
  if (loadedData.socialProof && typeof loadedData.socialProof === 'object') {
    result.socialProof = { ...defaultSettings.socialProof, ...loadedData.socialProof };
  }
  
  if (loadedData.spotsCounter && typeof loadedData.spotsCounter === 'object') {
    result.spotsCounter = { ...defaultSettings.spotsCounter, ...loadedData.spotsCounter };
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
      const { data, error } = await supabase
        .from('checkout_customizations')
        .select('settings')
        .eq('user_id', user?.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (error) {
        console.error('Error loading checkout customization:', error);
      } else if (data?.settings) {
        const mergedSettings = mergeSettings(data.settings);
        setSettings(mergedSettings);
      }
    } catch (error) {
      console.error('Error loading checkout customization:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: CheckoutCustomizationSettings) => {
    console.log('💾 Tentando salvar configurações...');
    console.log('👤 User existe?', !!user);
    console.log('📦 Product ID existe?', !!productId);
    console.log('📊 Settings recebidos:', newSettings);
    console.log('🎯 SpotsCounter:', newSettings.spotsCounter);
    
    if (!user || !productId) {
      console.error('❌ Erro: Usuário ou Product ID não encontrado');
      console.log('👤 User:', user);
      console.log('📦 Product ID:', productId);
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para salvar as configurações.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      
      console.log('🔄 Salvando configurações:', newSettings);
      console.log('👤 User ID:', user.id);
      console.log('📦 Product ID:', productId);
      console.log('🎯 SpotsCounter no save:', JSON.stringify(newSettings.spotsCounter, null, 2));

      // Convert settings to JSON-compatible format
      const settingsJson = JSON.parse(JSON.stringify(newSettings));
      console.log('📄 Settings JSON:', settingsJson);

      // Primeiro tentar atualizar o registro existente
      const { data: updateData, error: updateError } = await supabase
        .from('checkout_customizations')
        .update({ settings: settingsJson })
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .select();

      console.log('🔍 Update result:', { updateData, updateError });

      // Se não houve erro no update, significa que atualizou com sucesso
      if (!updateError && updateData && updateData.length > 0) {
        console.log('✅ Configurações atualizadas com sucesso!');
      } else {
        // Se não encontrou registro para atualizar, criar um novo
        const { error: insertError } = await supabase
          .from('checkout_customizations')
          .insert({
            user_id: user.id,
            product_id: productId,
            settings: settingsJson
          });

        if (insertError) {
          console.error('❌ Erro ao inserir:', insertError);
          throw insertError;
        }
        console.log('✅ Configurações criadas com sucesso!');
      }
      setSettings(newSettings);

      toast({
        title: "Configurações salvas!",
        description: "Suas personalizações do checkout foram aplicadas com sucesso.",
      });
    } catch (error) {
      console.error('❌ Error saving checkout customization:', error);
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
