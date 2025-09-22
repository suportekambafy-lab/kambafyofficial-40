
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
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Sempre buscar por produto específico se fornecido
      if (!productId) {
        // Se não há produto específico, resetar configurações
        setSettings({
          pixelId: '',
          enabled: false
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('facebook_pixel_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      console.log('📊 Pixel settings query result:', { data, error });

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Carregar dados reais se existirem
      if (data) {
        console.log('✅ Found pixel settings:', data);
        setSettings({
          id: data.id,
          pixelId: data.pixel_id,
          enabled: data.enabled
        });
      } else {
        console.log('❌ No pixel settings found');
        // Configurações vazias para novo produto
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
      // Verificar se existe um pixel já carregado E se é para o mesmo produto
      if (settings.id && productId) {
        // Update existing pixel for the same product
        result = await supabase
          .from('facebook_pixel_settings')
          .update(settingsData)
          .eq('id', settings.id)
          .select()
          .single();
      } else {
        // Check if pixel already exists for this product
        const { data: existingPixel } = await supabase
          .from('facebook_pixel_settings')
          .select('id')
          .eq('user_id', user.id)
          .eq('product_id', productId || null)
          .maybeSingle();

        if (existingPixel) {
          // Update existing pixel for this product
          result = await supabase
            .from('facebook_pixel_settings')
            .update(settingsData)
            .eq('id', existingPixel.id)
            .select()
            .single();
        } else {
          // Create new pixel for this product
          result = await supabase
            .from('facebook_pixel_settings')
            .insert(settingsData)
            .select()
            .single();
        }
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

      // Disparar evento para atualizar a lista de integrações
      window.dispatchEvent(new CustomEvent('integrationCreated', {
        detail: { type: 'facebook-pixel', productId: productId }
      }));

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
