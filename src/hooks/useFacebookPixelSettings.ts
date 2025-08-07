
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FacebookPixelSettings {
  id?: string;
  pixelId: string;
  enabled: boolean;
}

export const useFacebookPixelSettings = (productId?: string) => {
  const [settings, setSettings] = useState<FacebookPixelSettings>({
    pixelId: '',
    enabled: false
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      console.log('🔍 Fetching pixel settings for productId:', productId);
      
      let query = supabase.from('facebook_pixel_settings').select('*');
      
      if (productId) {
        // Busca específica para o produto
        query = query.eq('product_id', productId);
        console.log('📦 Searching for product-specific settings');
      } else {
        // Busca configurações globais (sem product_id)
        query = query.is('product_id', null);
        console.log('🌍 Searching for global settings');
      }
      
      const { data, error } = await query.maybeSingle();

      console.log('📊 Pixel settings query result:', { data, error });

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Sempre manter campos vazios - não pré-preencher
      if (data) {
        console.log('✅ Found pixel settings:', data);
        setSettings({
          id: data.id,
          pixelId: '', // Campo vazio para o usuário inserir
          enabled: false // Sempre começar desabilitado
        });
      } else {
        console.log('❌ No pixel settings found');
        // Manter campos vazios
        setSettings({
          pixelId: '',
          enabled: false
        });
      }
    } catch (error) {
      console.error('❌ Error fetching pixel settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Omit<FacebookPixelSettings, 'id'>) => {
    try {
      console.log('💾 Saving pixel settings for productId:', productId, 'Settings:', newSettings);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const settingsData = {
        user_id: user.id,
        pixel_id: newSettings.pixelId,
        enabled: newSettings.enabled,
        product_id: productId || null
      };

      console.log('📝 Settings data to save:', settingsData);

      let result;
      if (settings.id) {
        result = await supabase
          .from('facebook_pixel_settings')
          .update(settingsData)
          .eq('id', settings.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('facebook_pixel_settings')
          .insert(settingsData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      console.log('✅ Pixel settings saved successfully:', result.data);

      setSettings({
        id: result.data.id,
        ...newSettings
      });

      toast({
        title: "Pixel do Facebook salvo",
        description: "Configurações do pixel foram salvas com sucesso"
      });

      return true;
    } catch (error) {
      console.error('Error saving pixel settings:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações do pixel",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [productId]);

  const refetchSettings = () => {
    setLoading(true);
    fetchSettings();
  };

  return {
    settings,
    setSettings,
    loading,
    saveSettings,
    refetchSettings
  };
};
