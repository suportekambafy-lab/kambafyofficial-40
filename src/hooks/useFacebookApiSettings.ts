
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FacebookApiSettings {
  id?: string;
  appId: string;
  appSecret: string;
  accessToken: string;
  enabled: boolean;
}

export const useFacebookApiSettings = () => {
  const [settings, setSettings] = useState<FacebookApiSettings>({
    appId: '',
    appSecret: '',
    accessToken: '',
    enabled: false
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('facebook_api_settings')
        .select('*')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Sempre manter campos vazios - não pré-preencher
      if (data) {
        setSettings({
          id: data.id,
          appId: '', // Campo vazio para o usuário inserir
          appSecret: '', // Campo vazio para o usuário inserir
          accessToken: '', // Campo vazio para o usuário inserir
          enabled: false // Sempre começar desabilitado
        });
      } else {
        // Manter campos vazios
        setSettings({
          appId: '',
          appSecret: '',
          accessToken: '',
          enabled: false
        });
      }
    } catch (error) {
      console.error('Error fetching API settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Omit<FacebookApiSettings, 'id'>) => {
    try {
      console.log('💾 Saving API settings:', newSettings);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const settingsData = {
        user_id: user.id,
        app_id: newSettings.appId,
        app_secret: newSettings.appSecret,
        access_token: newSettings.accessToken,
        enabled: newSettings.enabled
      };

      console.log('📝 API settings data to save:', settingsData);

      let result;
      if (settings.id) {
        result = await supabase
          .from('facebook_api_settings')
          .update(settingsData)
          .eq('id', settings.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('facebook_api_settings')
          .insert(settingsData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      console.log('✅ API settings saved successfully:', result.data);

      setSettings({
        id: result.data.id,
        ...newSettings
      });

      toast({
        title: "API do Facebook salva",
        description: "Configurações da API foram salvas com sucesso"
      });

      return true;
    } catch (error) {
      console.error('Error saving API settings:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações da API",
        variant: "destructive"
      });
      return false;
    }
  };

  const testConnection = async () => {
    if (!settings.enabled || !settings.accessToken) {
      toast({
        title: "Erro",
        description: "Configure a API e token de acesso antes de testar",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`https://graph.facebook.com/me?access_token=${settings.accessToken}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      toast({
        title: "Conexão bem-sucedida",
        description: `Conectado como: ${data.name || 'Usuário Facebook'}`
      });
    } catch (error) {
      console.error('Error testing Facebook API:', error);
      toast({
        title: "Erro",
        description: "Falha ao conectar com a API do Facebook",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const refetchSettings = () => {
    setLoading(true);
    fetchSettings();
  };

  return {
    settings,
    setSettings,
    loading,
    saveSettings,
    testConnection,
    refetchSettings
  };
};
