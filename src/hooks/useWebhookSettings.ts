
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WebhookSettings {
  id?: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  product_id?: string;
}

export const useWebhookSettings = () => {
  const [settings, setSettings] = useState<WebhookSettings>({
    url: '',
    events: [],
    secret: '',
    active: true,
    headers: {},
    timeout: 30,
    retries: 3,
    product_id: ''
  });
  const [loading, setLoading] = useState(true);
  const [testLoading, setTestLoading] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_settings')
        .select('*')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          id: data.id,
          url: data.url,
          events: data.events || [],
          secret: data.secret || '',
          active: data.active,
          headers: (data.headers as Record<string, string>) || {},
          timeout: data.timeout || 30,
          retries: data.retries || 3
        });
      }
    } catch (error) {
      console.error('Error fetching webhook settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Omit<WebhookSettings, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Buscar o primeiro produto do usuário se não tiver product_id
      let productId = newSettings.product_id;
      if (!productId) {
        const { data: products } = await supabase
          .from('products')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);
        
        if (products && products.length > 0) {
          productId = products[0].id;
        }
      }

      const settingsData = {
        user_id: user.id,
        url: newSettings.url,
        events: newSettings.events,
        secret: newSettings.secret,
        active: newSettings.active,
        headers: newSettings.headers || {},
        timeout: newSettings.timeout || 30,
        retries: newSettings.retries || 3,
        product_id: productId
      };

      console.log('Saving webhook settings:', settingsData);

      let result;
      if (settings.id) {
        result = await supabase
          .from('webhook_settings')
          .update(settingsData)
          .eq('id', settings.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('webhook_settings')
          .insert(settingsData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      console.log('Webhook settings saved successfully:', result.data);

      setSettings({
        id: result.data.id,
        ...newSettings,
        product_id: productId
      });

      toast({
        title: "Webhook salvo",
        description: "Configurações do webhook foram salvas com sucesso"
      });

      // Disparar evento para atualizar a lista de integrações
      window.dispatchEvent(new CustomEvent('integrationCreated', {
        detail: { type: 'webhook' }
      }));

      return true;
    } catch (error) {
      console.error('Error saving webhook settings:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações do webhook",
        variant: "destructive"
      });
      return false;
    }
  };

  const testWebhook = async () => {
    if (!settings.url) {
      toast({
        title: "Erro",
        description: "Configure o webhook antes de testar",
        variant: "destructive"
      });
      return;
    }

    setTestLoading(true);
    
    try {
      const testPayload = {
        event: "test.webhook",
        timestamp: new Date().toISOString(),
        data: {
          message: "Teste de webhook da Kambafy",
          test_id: Math.random().toString(36).substr(2, 9),
          user_id: (await supabase.auth.getUser()).data.user?.id,
          environment: "test"
        },
        webhook_id: settings.id,
        version: "1.0"
      };

      console.log('Enviando teste do webhook:', testPayload);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...settings.headers
      };

      if (settings.secret) {
        headers["X-Webhook-Secret"] = settings.secret;
        headers["Authorization"] = `Bearer ${settings.secret}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), (settings.timeout || 30) * 1000);

      const response = await fetch(settings.url, {
        method: "POST",
        headers,
        body: JSON.stringify(testPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseText = await response.text().catch(() => 'Sem corpo de resposta');
      
      // Log do teste do webhook
      const { data: { user } } = await supabase.auth.getUser();
      if (user && settings.id) {
        await supabase.from('webhook_logs').insert({
          user_id: user.id,
          webhook_id: settings.id,
          event_type: 'test.webhook',
          payload: testPayload,
          response_status: response.status,
          response_body: responseText,
          success: response.ok
        });
      }

      if (response.ok) {
        toast({
          title: "Teste bem-sucedido",
          description: `Webhook testado com sucesso. Status: ${response.status}`,
        });
      } else {
        toast({
          title: "Teste falhou",
          description: `Erro no webhook. Status: ${response.status}`,
          variant: "destructive"
        });
      }

      console.log('Resposta do webhook:', {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText
      });

    } catch (error) {
      console.error('Erro ao testar webhook:', error);
      
      let errorMessage = "Falha ao enviar webhook de teste";
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = `Timeout após ${settings.timeout || 30} segundos`;
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: "Erro no teste",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setTestLoading(false);
    }
  };

  const triggerWebhook = async (eventType: string, data: any) => {
    if (!settings.url || !settings.active) {
      return;
    }

    try {
      const payload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        data,
        webhook_id: settings.id,
        version: "1.0"
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...settings.headers
      };

      if (settings.secret) {
        headers["X-Webhook-Secret"] = settings.secret;
        headers["Authorization"] = `Bearer ${settings.secret}`;
      }

      const response = await fetch(settings.url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const responseText = await response.text().catch(() => 'Sem corpo de resposta');

      // Log do webhook
      const { data: { user } } = await supabase.auth.getUser();
      if (user && settings.id) {
        await supabase.from('webhook_logs').insert({
          user_id: user.id,
          webhook_id: settings.id,
          event_type: eventType,
          payload,
          response_status: response.status,
          response_body: responseText,
          success: response.ok
        });
      }

      return response.ok;
    } catch (error) {
      console.error('Erro ao disparar webhook:', error);
      return false;
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
    testLoading,
    saveSettings,
    testWebhook,
    triggerWebhook,
    refetchSettings
  };
};
